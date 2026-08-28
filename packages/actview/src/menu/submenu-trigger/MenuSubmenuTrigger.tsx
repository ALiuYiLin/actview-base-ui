import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { mergePropsN } from '@/merge-props';
import { EMPTY_OBJECT } from '@/utils/empty';
import { safePolygon, useClick, useHoverReferenceInteraction } from '@/floating-ui-react';
import type { BaseUIComponentProps, NonNativeButtonProps } from '@/internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuItem } from '../item/useMenuItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useTriggerRegistration } from '@/utils/popups';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

const VOICE_OVER_EXPANDED_PROPS = {'aria-expanded': undefined};

/**
 * A menu item that opens a submenu.
 * Renders a `<div>` element.
 */
export function MenuSubmenuTrigger(componentProps: MenuSubmenuTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const openOnHover = computed(() => componentProps.openOnHover ?? true);
  const delay = componentProps.delay ?? 100;
  const closeDelay = componentProps.closeDelay ?? 0;
  const disabled = computed(
    () =>
      (componentProps.disabled ?? false) ||
      rootDisabled.value ||
      parentDisabled.value,
  );

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const submenuRootContext = useMenuSubmenuRootContext();
  if (!submenuRootContext?.parentMenu) {
    throw new Error('Base UI: <Menu.SubmenuTrigger> must be placed in <Menu.SubmenuRoot>.');
  }

  const listItem = useCompositeListItem({guess: true, label: componentProps.label});
  const menuPositionerContext = useMenuPositionerContext();

  const {store} = useMenuRootContext();

  const thisTriggerId = useBaseUiId(componentProps.id);
  const open = store.useState('open');
  const floatingRootContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const popupId = store.useState('triggerPopupId', thisTriggerId);

  const baseRegisterTrigger = useTriggerRegistration(thisTriggerId, store);
  const registerTrigger = (element: Element | null) => {
    baseRegisterTrigger(element);

    if (element !== null && store.select('open') && store.select('activeTriggerId') == null) {
      store.update({
        activeTriggerId: thisTriggerId ?? null,
        activeTriggerElement: element,
        closeDelay,
      } as any);
    }
  };

  const triggerElementRef = ref<HTMLElement | null>(null);
  const handleTriggerElementRef = (el: HTMLElement | null) => {
    triggerElementRef.value = el;
    store.set('activeTriggerElement', el as any);
  };

  // 注册 rendered element（等效 React 的 useIsoLayoutEffect）
  const renderRegistered = (() => {
    let registered = false;
    return (el: HTMLElement | null) => {
      if (!registered) {
        registered = true;
        registerTrigger(el);
      }
    };
  })();

  store.useSyncedValue('closeDelay', closeDelay);

  const parentMenuStore = submenuRootContext.parentMenu;
  const rootDisabled = store.useState('disabled');
  const parentDisabled = parentMenuStore.useState('disabled');

  const itemProps = parentMenuStore.useState('itemProps');
  const highlighted = computed(() =>
    parentMenuStore.select('isActive', listItem.index.value),
  );

  const itemMetadata = {
    type: 'submenu-trigger' as const,
    setActive() {
      if (parentMenuStore.select('highlightItemOnHover')) {
        parentMenuStore.set('activeIndex', listItem.index.value);
      }
    },
  };

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick: false,
    disabled: disabled.value,
    highlighted: false, // data-highlighted 由 rootProps computed 计算
    id: thisTriggerId,
    store,
    typingRef: parentMenuStore.context.typingRef as unknown as Ref<boolean>,
    nativeButton: componentProps.nativeButton ?? false,
    itemMetadata: itemMetadata as any,
    nodeId: menuPositionerContext?.nodeId,
  });

  const hoverEnabled = store.useState('hoverEnabled');

  const hoverProps = useHoverReferenceInteraction(floatingRootContext.value as any, {
    enabled: hoverEnabled.value && openOnHover.value && !disabled.value,
    handleClose: safePolygon({blockPointerEvents: true}) as any,
    mouseOnly: true,
    move: true,
    restMs: delay,
    delay: {open: delay, close: closeDelay},
    shouldOpen: delay > 0 ? () => parentMenuStore.select('allowMouseEnter') : undefined,
    triggerElementRef: triggerElementRef as any,
    externalTree: floatingTreeRoot.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
    guardStaleOpen: true,
  } as any);

  const click = useClick(floatingRootContext.value as any, {
    enabled: !disabled.value,
    event: 'mousedown',
    toggle: !openOnHover.value,
    ignoreMouse: openOnHover.value,
    stickIfOpen: false,
  } as any);

  const localInteractionProps = click.reference ?? EMPTY_OBJECT;

  const rootTriggerProps = store.useState('triggerProps', true);

  // 事件 handler：setup 闭包。
  // Arrow keys open the submenu through list navigation without dispatching a click, so
  // `openMethod` stays null there; Enter and Space do dispatch one and report `keyboard`.
  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const openedByKeyboard = () =>
    lastOpenChangeReason.value === REASONS.listNavigation || openMethod.value === 'keyboard';
  // actview 环境（jsdom）无 VoiceOver 检测——恒 false。
  const voiceOver = false;
  const shouldOmitExpanded = () => open.value && openedByKeyboard() && voiceOver;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuSubmenuTriggerState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
    open: open.value,
  }));

  // 根元素 props：click/hover 处理器 → store triggerProps → itemProps →
  // aria/blur → 透传 → getItemProps → open/highlighted/disabled data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = state.value;

    const merged: any = mergePropsN<any>([
      localInteractionProps,
      hoverProps,
      rootTriggerProps.value,
      itemProps.value,
      // VoiceOver 兼容
      (shouldOmitExpanded() ? VOICE_OVER_EXPANDED_PROPS : undefined) as any,
      {
        'aria-controls': popupId.value,
        tabIndex: open.value || highlighted.value ? 0 : -1,
        onBlur() {
          if (highlighted.value) {
            parentMenuStore.set('activeIndex', null);
          }
        },
      },
      elementProps.value,
      getItemProps as any,
    ]);

    if (stateValue.open) {
      merged['data-open'] = '';
    } else {
      merged['data-closed'] = '';
    }
    if (stateValue.highlighted) {
      merged['data-highlighted'] = '';
    }
    if (stateValue.disabled) {
      merged['data-disabled'] = '';
    }
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLElement | null) => {
              itemRef?.(el);
              listItem.ref(el);
              renderRegistered(el);
              handleTriggerElementRef(el);
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface MenuSubmenuTriggerState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
}

export interface MenuSubmenuTriggerProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuSubmenuTriggerState> {
  onClick?: BaseUIComponentProps<'div', MenuSubmenuTriggerState>['onClick'] | undefined;
  /**
   * Overrides the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export namespace MenuSubmenuTrigger {
  export type Props = MenuSubmenuTriggerProps;
  export type State = MenuSubmenuTriggerState;
}

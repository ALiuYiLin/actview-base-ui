import { computed, ref, toRefs, unrefs, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { EMPTY_OBJECT } from '@/utils/empty';
import { safePolygon, useClick, useHoverReferenceInteraction } from '@/floating-ui-react';
import type { BaseUIComponentProps, NonNativeButtonProps, HTMLProps } from '@/internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuItem } from '../item/useMenuItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useTriggerRegistration } from '@/utils/popups';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';
import { REASONS } from '@/internals/reasons';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

const VOICE_OVER_EXPANDED_PROPS = {'aria-expanded': undefined};

/**
 * A menu item that opens a submenu.
 * Renders a `<div>` element.
 */
export function MenuSubmenuTrigger(componentProps: MenuSubmenuTrigger.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    label,
    id: idProp,
    nativeButton = false,
    openOnHover = true,
    delay = 100,
    closeDelay = 0,
    disabled: disabledProp = false,
  } = componentProps;

  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(componentProps);

  const submenuRootContext = useMenuSubmenuRootContext();
  if (!submenuRootContext?.parentMenu) {
    throw new Error('Base UI: <Menu.SubmenuTrigger> must be placed in <Menu.SubmenuRoot>.');
  }

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext();

  const {store} = useMenuRootContext();

  const thisTriggerId = useBaseUiId(idProp);
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
  const disabled = disabledProp || rootDisabled.value || parentDisabled.value;

  const itemProps = parentMenuStore.useState('itemProps');
  const highlighted = computed(() =>
    parentMenuStore.select('isActive', toValue(listItem.index)),
  );

  const itemMetadata = {
    type: 'submenu-trigger' as const,
    setActive() {
      if (parentMenuStore.select('highlightItemOnHover')) {
        parentMenuStore.set('activeIndex', toValue(listItem.index));
      }
    },
  };

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick: false,
    disabled,
    highlighted: false,
    id: thisTriggerId,
    store,
    typingRef: parentMenuStore.context.typingRef as unknown as Ref<boolean>,
    nativeButton,
    itemMetadata: itemMetadata as any,
    nodeId: menuPositionerContext?.nodeId,
  });

  const hoverEnabled = store.useState('hoverEnabled');

  const hoverProps = useHoverReferenceInteraction(floatingRootContext.value as any, {
    enabled: hoverEnabled.value && openOnHover && !disabled,
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
    enabled: !disabled,
    event: 'mousedown',
    toggle: !openOnHover,
    ignoreMouse: openOnHover,
    stickIfOpen: false,
  } as any);

  const localInteractionProps = click.reference ?? EMPTY_OBJECT;

  const rootTriggerProps = store.useState('triggerProps', true);
  delete (rootTriggerProps as any).id;

  const state = (): MenuSubmenuTriggerState => ({
    disabled,
    highlighted: highlighted.value,
    open: open.value,
  });

  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  // Arrow keys open the submenu through list navigation without dispatching a click, so
  // `openMethod` stays null there; Enter and Space do dispatch one and report `keyboard`.
  const openedByKeyboard = () =>
    lastOpenChangeReason.value === REASONS.listNavigation || openMethod.value === 'keyboard';
  // actview 环境（jsdom）无 VoiceOver 检测——恒 false。
  const voiceOver = false;
  const shouldOmitExpanded = () => open.value && openedByKeyboard() && voiceOver;

  const {element} = useRenderElement({
    props: () => {
      const stateValue = state();

      const merged: any = mergePropsN<any>([
        localInteractionProps,
        hoverProps,
        rootTriggerProps,
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
        unrefs(elementProps),
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
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLElement | null) => {
          itemRef?.(el);
          listItem.ref(el);
          renderRegistered(el);
          handleTriggerElementRef(el);
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
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

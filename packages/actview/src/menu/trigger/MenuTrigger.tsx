import { computed, onUnmounted, ref, toRefs, watch } from 'actview';
import type { Ref } from 'actview';
import { useTimeout } from '@/utils/useTimeout';
import { ownerDocument } from '@/internals/owner';
import { useStableCallback } from '@/utils/useStableCallback';
import { EMPTY_OBJECT } from '@/utils/empty';
import {
  safePolygon,
  useClick,
  useFloatingTree,
  useFocus,
  useHoverReferenceInteraction,
} from '@/floating-ui-react';
import type { FloatingTreeStore } from '@/floating-ui-react/components/FloatingTreeStore';
import { contains } from '@/floating-ui-react/utils';
import { useMenuRootContext } from '../root/MenuRootContext';
import { pressableTriggerOpenStateMapping } from '@/utils/popupStateMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import { isMouseWithinBounds } from '@/utils/getPseudoElementBounds';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { findRootOwnerId } from '../utils/findRootOwnerId';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { REASONS } from '@/internals/reasons';
import { useMixedToggleClickHandler } from '@/utils/useMixedToggleClickHandler';
import type { MenuHandle } from '../store/MenuHandle';
import { useMenubarContext } from '@/menubar/MenubarContext';
import type { MenuParent } from '../root/MenuRoot';
import { PATIENT_CLICK_THRESHOLD } from '@/internals/constants';
import { FocusGuard } from '@/utils/FocusGuard';
import { mergeProps, mergePropsN } from '@/merge-props';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A button that opens the menu.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuTrigger(componentProps: MenuTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabledComputed = computed(() => componentProps.disabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);
  const delay = componentProps.delay ?? 100;
  const closeDelay = componentProps.closeDelay ?? 0;

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const rootContext = useMenuRootContext(true);
  const handleStore = usePopupHandleStore(componentProps.handle);
  const store = handleStore?.value ?? rootContext?.store;
  if (!store) {
    throw new Error(
      'Base UI: <Menu.Trigger> must be either used within a <Menu.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(componentProps.id);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const floatingRootContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);
  const popupId = store.useState('triggerPopupId', thisTriggerId);

  const triggerElementRef = ref<HTMLElement | null>(null);

  const parent = useMenuParent();
  const compositeRootContext = useCompositeRootContextForTrigger();
  const floatingTreeRootFromContext = useFloatingTree();
  const floatingTreeRoot: FloatingTreeStore = (() => {
    return (
      floatingTreeRootFromContext ??
      (store.state.floatingTreeRoot as unknown as FloatingTreeStore) ??
      (floatingTreeRootFromContext as unknown as FloatingTreeStore)
    );
  })();

  const menubarContext = useMenubarContext(true);
  const isInMenubar = !!menubarContext && parent.type === 'menubar';

  watch(
    () => [isOpenedByThisTrigger.value, store, parent.type] as const,
    () => {
      if (isOpenedByThisTrigger.value && store.select('lastOpenChangeReason') === REASONS.triggerHover) {
        store.context.allowMouseUpTriggerRef.value = false;
      }
    },
    {flush: 'post', immediate: true},
  );

  const allowMouseUpTriggerTimeout = useTimeout();

  const handleDocumentMouseUp = useStableCallback((mouseEvent: MouseEvent) => {
    if (!triggerElementRef.value) {
      return;
    }

    allowMouseUpTriggerTimeout.clear();
    store.context.allowMouseUpTriggerRef.value = false;

    const mouseUpTarget = mouseEvent.target as Element | null;

    if (
      contains(triggerElementRef.value, mouseUpTarget) ||
      contains(store.select('positionerElement'), mouseUpTarget) ||
      mouseUpTarget === triggerElementRef.value
    ) {
      return;
    }

    if (mouseUpTarget != null && findRootOwnerId(mouseUpTarget) === store.select('rootId')) {
      return;
    }

    if (isMouseWithinBounds(mouseEvent, triggerElementRef.value)) {
      return;
    }

    floatingTreeRoot.events.emit('close', {domEvent: mouseEvent, reason: REASONS.cancelOpen});
  });

  watch(
    () => [isOpenedByThisTrigger.value, store] as const,
    () => {
      if (
        isOpenedByThisTrigger.value &&
        store.select('lastOpenChangeReason') === REASONS.triggerHover
      ) {
        const doc = ownerDocument(triggerElementRef.value);
        doc.addEventListener('mouseup', handleDocumentMouseUp, {once: true});
      }
    },
    {flush: 'post', immediate: true},
  );

  const parentMenubarHasSubmenuOpen = isInMenubar && parent.context.hasSubmenuOpen;
  const openOnHover = componentProps.openOnHover ?? parentMenubarHasSubmenuOpen;
  const isMountedByThisTrigger = store.useState('isMountedByTrigger', thisTriggerId);

  const hoverProps = useHoverReferenceInteraction(floatingRootContext.value, {
    enabled:
      openOnHover &&
      !disabledComputed.value &&
      (!isInMenubar || (parentMenubarHasSubmenuOpen && !isMountedByThisTrigger.value)),
    handleClose: safePolygon({blockPointerEvents: !isInMenubar}) as any,
    mouseOnly: true,
    move: false,
    restMs: parent.type === undefined ? delay : undefined,
    delay: {close: closeDelay},
    triggerElementRef: triggerElementRef as any,
    externalTree: floatingTreeRoot,
    isActiveTrigger: isTriggerActive.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  // Whether to ignore clicks to open the menu.
  const stickIfOpen = useStickIfOpen(isOpenedByThisTrigger, () =>
    store.select('lastOpenChangeReason'),
  );

  const click = useClick(floatingRootContext.value, {
    enabled: !disabledComputed.value,
    event: isOpenedByThisTrigger.value && isInMenubar ? 'click' : 'mousedown',
    toggle: true,
    ignoreMouse: false,
    stickIfOpen: parent.type === undefined ? stickIfOpen.value : false,
  });

  const focus = useFocus(floatingRootContext.value, {
    enabled: !disabledComputed.value && parentMenubarHasSubmenuOpen,
  });

  const mixedToggleHandlers = useMixedToggleClickHandler({
    open: isOpenedByThisTrigger,
    enabled: isInMenubar,
    mouseDownAction: 'open',
  });

  const localInteractionProps = mergeProps(focus.reference, click.reference);

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger.value);

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} =
    useTriggerFocusGuards(store, triggerElementRef);

  const button = useButton({
    disabled: disabledComputed.value,
    native: nativeButton,
  });
  const buttonRef = button.buttonRef;
  const getButtonProps = button.getButtonProps;

  const {registerTrigger, isMountedByThisTrigger: mountedByThis} = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef as any,
    store,
    {payload: componentProps.payload as any},
  );

  const refs = [
    (el: HTMLElement | null) => {
      triggerElementRef.value = el;
    },
    buttonRef,
    registerTrigger,
  ] as any[];

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuTriggerState>(() => ({
    disabled: disabledComputed.value,
    open: isOpenedByThisTrigger.value,
  }));

  // 根元素 props：click/hover/focus 处理器 → store triggerProps → aria/id →
  // menubar role → mixed toggle → 透传 → getButtonProps。
  const propsList = computed<any[]>(() => [
    localInteractionProps,
    hoverProps ?? EMPTY_OBJECT,
    rootTriggerProps.value,
    {
      'aria-haspopup': 'menu' as const,
      'aria-controls': popupId.value,
      id: thisTriggerId,
      onMouseDown: (event: any) => {
        if (store.select('open')) {
          return;
        }

        // mousedown -> mouseup on menu item should not trigger it within 200ms.
        allowMouseUpTriggerTimeout.start(200, () => {
          store.context.allowMouseUpTriggerRef.value = true;
        });

        const doc = ownerDocument(event.currentTarget);
        doc.addEventListener('mouseup', handleDocumentMouseUp, {once: true});
      },
    },
    isInMenubar ? {role: 'menuitem'} : {},
    mixedToggleHandlers,
    getButtonProps,
  ]);

  const rootProps = computed<Record<string, any>>(() => {
    const merged = mergePropsN<any>([...propsList.value, elementProps.value]);
    Object.assign(
      merged,
      pressableTriggerOpenStateMapping.open(isOpenedByThisTrigger.value),
    );
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // actview 渲染无法原地 patch div↔button 结构切换（open 时包裹 guards、
  // 关闭时不包裹会导致 button 元素重建，domReference 变 disconnected），
  // 因此始终使用稳定的 div 包裹结构。
  if (!isInMenubar) {
    return (
      <div key={`${thisTriggerId}-guards`}>
        <FocusGuard
          ref={(el: any) => (preFocusGuardRef.value = el)}
          onFocus={handlePreFocusGuardFocus}
        />
        {useRenderElement(
          'button',
          {
            className: className?.value,
            render: render?.value,
            style: style?.value,
          },
          {
            state: state.value,
            ref: useMergedRefs(
              (el: HTMLElement | null) => {
                triggerElementRef.value = el;
              },
              buttonRef as any,
              registerTrigger as any,
              componentProps.ref as any,
            ),
            props: rootProps.value,
          },
        )}
        <FocusGuard
          ref={(el: any) => (store.context.triggerFocusTargetRef.value = el)}
          onFocus={handleFocusTargetFocus}
        />
      </div>
    );
  }

  return (
    <CompositeItem
      tag="button"
      render={render as any}
      className={className as any}
      style={style as any}
      state={state.value as any}
      refs={refs}
      props={propsList.value}
      stateAttributesMapping={pressableTriggerOpenStateMapping}
    />
  );
}

/**
 * Determines whether to ignore clicks after a hover-open.
 * (actview 版：返回 Ref<boolean> 读 .value。)
 */
function useStickIfOpen(open: Ref<boolean>, getOpenReason: () => string | null) {
  const stickIfOpenTimeout = useTimeout();
  const stickIfOpen = ref(false);

  watch(
    () => [open.value, getOpenReason()] as const,
    () => {
      const openReason = getOpenReason();
      if (open.value && openReason === REASONS.triggerHover) {
        // Only allow "patient" clicks to close the menu if it's open.
        stickIfOpen.value = true;
        stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          stickIfOpen.value = false;
        });
      } else if (!open.value) {
        stickIfOpenTimeout.clear();
        stickIfOpen.value = false;
      }
    },
    {flush: 'post', immediate: true},
  );

  return stickIfOpen;
}

function useMenuParent() {
  const menubarContext = useMenubarContext(true);

  const parent: MenuParent = (() => {
    if (menubarContext) {
      return {
        type: 'menubar',
        context: menubarContext,
      };
    }

    return {
      type: undefined,
    };
  })();

  return parent;
}

function useCompositeRootContextForTrigger() {
  return undefined as any;
}

function mergeRefs(refs: any[]) {
  return (el: HTMLElement | null) => {
    for (const r of refs) {
      if (typeof r === 'function') {
        r(el);
      } else if (r) {
        r.value = el;
      }
    }
  };
}

export interface MenuTriggerProps<Payload = unknown>
  extends NativeButtonProps, BaseUIComponentProps<'button', MenuTriggerState> {
  children?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A handle to associate the trigger with a menu.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * A payload to pass to the menu when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before the menu may be opened on hover.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export interface MenuTriggerState {
  /**
   * Whether the menu is currently open and was opened by this trigger.
   */
  open: boolean;
  /**
   * Whether the trigger is disabled.
   */
  disabled: boolean;
}

export namespace MenuTrigger {
  export type Props<Payload = unknown> = MenuTriggerProps<Payload>;
  export type State = MenuTriggerState;
}

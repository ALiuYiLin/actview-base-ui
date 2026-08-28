import { computed, onUnmounted, ref, watch } from 'actview';
import type { Ref } from 'actview';
import { useTimeout } from '@/utils/useTimeout';
import { useStableCallback } from '@/utils/useStableCallback';
import { useId } from '@/utils/useId';
import { useRefWithInit } from '@/utils/useRefWithInit';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@/utils/empty';
import {
  FloatingTree,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useListNavigation,
  useTypeahead,
  useSyncedFloatingRootContext,
} from '@/floating-ui-react';
import { MenuRootContext, useMenuRootContext } from './MenuRootContext';
import { MenubarContext, useMenubarContext } from '@/menubar/MenubarContext';
import { TYPEAHEAD_RESET_MS } from '@/internals/constants';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { useOpenInteractionType } from '@/utils/useOpenInteractionType';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import {
  ContextMenuRootContext,
  useContextMenuRootContext,
} from '@/context-menu/root/ContextMenuRootContext';
import { mergeProps } from '@/merge-props';
import { MenuStore, type State as MenuStoreState } from '../store/MenuStore';
import { MenuHandle } from '../store/MenuHandle';
import {
  attachPreventUnmountOnClose,
  FOCUSABLE_POPUP_PROPS,
  type PayloadChildRenderFunction,
  createPopupOpenState,
  PopupHandleAttachment,
  useImplicitActiveTrigger,
  useOpenStateTransitions,
  usePopupInteractionProps,
} from '@/utils/popups';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';

/**
 * Groups all parts of the menu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRoot<Payload>(props: MenuRoot.Props<Payload>) {
  // ============ setup（只执行一次） ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）；
  // 回调类 props（onOpenChange 等）事件期直读 props。
  const disabledComputed = computed(() => props.disabled ?? false);
  const highlightItemOnHoverComputed = computed(() => props.highlightItemOnHover ?? true);
  const modalComputed = computed(() => props.modal);

  const defaultOpen = props.defaultOpen ?? false;
  const loopFocus = props.loopFocus ?? true;
  const orientation = props.orientation ?? 'vertical';
  const closeParentOnEsc = props.closeParentOnEsc ?? false;
  const defaultTriggerIdProp = props.defaultTriggerId ?? null;

  const contextMenuContext = useContextMenuRootContext(true);
  const parentMenuRootContext = useMenuRootContext(true);
  const menubarContext = useMenubarContext(true);
  const isSubmenu = useMenuSubmenuRootContext();

  const parentFromContext: MenuParent = (() => {
    if (isSubmenu && parentMenuRootContext) {
      return {
        type: 'menu',
        store: parentMenuRootContext.store,
      };
    }

    if (menubarContext) {
      return {
        type: 'menubar',
        context: menubarContext,
      };
    }

    // Ensure this is not a Menu nested inside ContextMenu.Trigger.
    if (contextMenuContext && !parentMenuRootContext) {
      return {
        type: 'context-menu',
        context: contextMenuContext,
      };
    }

    return {
      type: undefined,
    };
  })();

  const rootId = useId();
  const floatingId = useId();
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  const store = useMenuRootStore<Payload>(
    {
      open: defaultOpen,
      openProp: props.open,
      activeTriggerId: defaultTriggerIdProp,
      triggerIdProp: props.triggerId,
      parent: parentFromContext,
      disabled: disabledComputed.value,
      highlightItemOnHover: highlightItemOnHoverComputed.value,
      modal: parentFromContext.type === undefined ? props.modal : undefined,
      rootId,
    },
    floatingId,
    floatingParentNodeIdFromContext != null,
  );

  // 受控 prop 传 getter：setup 解构的 openProp 是快照（props 代理的惰性读），
  // 受控值后续变化（运行时切换 open）不会触发 useControlledProp 的 watch——
  // 传 () => props.open 让 watch 追踪 props 代理。
  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  store.useContextCallback('onOpenChangeComplete', (...args: any[]) =>
    props.onOpenChangeComplete?.(...(args as [boolean])));

  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const floatingNodeIdFromContext = useFloatingNodeId(floatingTreeRoot.value);

  const open = store.useState('open');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const parent = store.useState('parent');

  const activeIndex = store.useState('activeIndex');
  const payload = store.useState('payload') as unknown as Ref<Payload | undefined>;
  const floatingParentNodeId = store.useState('floatingParentNodeId');

  const openEventRef = ref(null as Event | null);
  const allowOutsidePressDismissalRef = ref(parent.value.type !== 'context-menu');
  const allowOutsidePressDismissalTimeout = useTimeout();
  const allowTouchToCloseRef = ref(true);
  const allowTouchToCloseTimeout = useTimeout();

  const nested = floatingParentNodeId != null;

  if (process.env.NODE_ENV !== 'production') {
    if (parent.value.type !== undefined && props.modal !== undefined) {
      console.warn(
        'Base UI: The `modal` prop is not supported on nested menus. It will be ignored.',
      );
    }
  }

  const {openMethod, triggerProps: interactionTypeProps} = useOpenInteractionType(open);

  watch(
    () => openMethod.value,
    (v) => {
      if (store.state.openMethod !== v) {
        store.set('openMethod', v);
      }
    },
    {flush: 'post', immediate: true},
  );

  store.useSyncedValues({
    disabled: disabledComputed,
    highlightItemOnHover: highlightItemOnHoverComputed,
    modal: computed(() => (parent.value.type === undefined ? props.modal : undefined)),
    rootId,
  } as any);

  useImplicitActiveTrigger(store);
  const {forceUnmount} = useOpenStateTransitions(open as any, store, () => {
    store.set('allowMouseEnter', false);
  });

  watch(
    () => [
      contextMenuContext,
      parentMenuRootContext,
      floatingNodeIdFromContext.value,
      floatingParentNodeIdFromContext,
    ] as const,
    () => {
      const updates: any = {
        floatingNodeId: floatingNodeIdFromContext.value,
        floatingParentNodeId: floatingParentNodeIdFromContext,
      };
      if (contextMenuContext && !parentMenuRootContext) {
        // This is a context menu root.
        updates.parent = {
          type: 'context-menu',
          context: contextMenuContext,
        };
      }
      store.update(updates);
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [open.value, parent.value.type] as const,
    () => {
      if (!open.value) {
        openEventRef.value = null;
      }

      if (parent.value.type !== 'context-menu') {
        return;
      }

      if (!open.value) {
        allowOutsidePressDismissalTimeout.clear();
        allowOutsidePressDismissalRef.value = false;
        return;
      }

      // With `mousedown` outside press events and long press touch input, there
      // needs to be a grace period after opening to ensure the dismissal event
      // doesn't fire immediately after open.
      allowOutsidePressDismissalTimeout.start(500, () => {
        allowOutsidePressDismissalRef.value = true;
      });
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [open.value, hoverEnabled.value] as const,
    () => {
      if (!open.value && !hoverEnabled.value) {
        store.set('hoverEnabled', true);
      }
    },
    {flush: 'post', immediate: true},
  );

  const setOpen = useStableCallback(
    (
      nextOpen: boolean,
      eventDetails: Omit<MenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
    ) => {
      const reason = eventDetails.reason;

      // Read the store directly, as relayed tree events and stale hover timers can request
      // a close after the state changed but before this component re-rendered.
      if (!nextOpen && !store.select('open')) {
        return;
      }

      if (
        open.value === nextOpen &&
        eventDetails.trigger === activeTriggerElement.value &&
        lastOpenChangeReason.value === reason
      ) {
        return;
      }

      const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(
        eventDetails as MenuRoot.ChangeEventDetails,
      );

      // Do not immediately reset the activeTriggerId to allow
      // exit animations to play and focus to be returned correctly.
      if (!nextOpen && eventDetails.trigger == null) {
        eventDetails.trigger = activeTriggerElement.value ?? undefined;
      }

      props.onOpenChange?.(nextOpen, eventDetails as MenuRoot.ChangeEventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);

      const nativeEvent = eventDetails.event as Event;
      if (
        nextOpen === false &&
        nativeEvent?.type === 'click' &&
        (nativeEvent as PointerEvent).pointerType === 'touch' &&
        !allowTouchToCloseRef.value
      ) {
        return;
      }

      // Prevent the menu from closing on mobile devices that have a delayed click event.
      if (nextOpen && reason === REASONS.triggerFocus) {
        allowTouchToCloseRef.value = false;
        allowTouchToCloseTimeout.start(300, () => {
          allowTouchToCloseRef.value = true;
        });
      } else {
        allowTouchToCloseRef.value = true;
        allowTouchToCloseTimeout.clear();
      }

      // Keyboard and assistive-technology activations produce `detail === 0` clicks;
      // mouse-gesture clicks carry `detail >= 1`.
      const isKeyboardClick =
        (reason === REASONS.triggerPress || reason === REASONS.itemPress) &&
        (nativeEvent as MouseEvent).detail === 0;
      const isDismissClose = !nextOpen && (reason === REASONS.escapeKey || reason == null);

      openEventRef.value = eventDetails.event;

      const popupOpenState = createPopupOpenState(
        store.state,
        nextOpen,
        eventDetails.trigger,
        shouldPreventUnmountOnClose(),
      ) as ReturnType<typeof createPopupOpenState> & {
        openChangeReason: MenuRoot.ChangeEventReason;
      };

      popupOpenState.openChangeReason = reason;
      store.update(popupOpenState);

      if (
        parent.value.type === 'menubar' &&
        (reason === REASONS.triggerFocus ||
          reason === REASONS.focusOut ||
          reason === REASONS.triggerHover ||
          reason === REASONS.listNavigation ||
          reason === REASONS.siblingOpen)
      ) {
        store.set('instantType', 'group');
      } else if (isKeyboardClick || isDismissClose) {
        store.set('instantType', isKeyboardClick ? 'click' : 'dismiss');
      } else {
        store.set('instantType', undefined);
      }
    },
  );

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    floatingRootContext: store.state.floatingRootContext,
    floatingId,
    nested: floatingParentNodeIdFromContext != null,
    onOpenChange: setOpen,
  });

  const floatingEvents = floatingRootContext.context.events;

  // Registered in a layout effect (not a passive one) so `setOpen` emits from imperative
  // `MenuHandle.open()` calls made in the same commit this root mounts.
  watch(
    () => [floatingEvents, setOpen] as const,
    () => {
      const handleSetOpenEvent = ({
        open: nextOpen,
        eventDetails,
      }: {
        open: boolean;
        eventDetails: MenuRoot.ChangeEventDetails;
      }) => setOpen(nextOpen, eventDetails);

      floatingEvents.on('setOpen', handleSetOpenEvent);

      return () => {
        floatingEvents?.off('setOpen', handleSetOpenEvent);
      };
    },
    {flush: 'post', immediate: true},
  );

  const handleImperativeClose = () => {
    store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction));
  };

  // actionsRef：ref 对象事件期直读（prop 变化时写入最新对象）。
  watch(
    () => props.actionsRef,
    (actionsRefObj) => {
      if (actionsRefObj) {
        actionsRefObj.value = {unmount: forceUnmount, close: handleImperativeClose};
      }
    },
    {immediate: true},
  );
  onUnmounted(() => {
    const actionsRefObj = props.actionsRef;
    if (actionsRefObj) {
      actionsRefObj.value = null;
    }
  });

  let ctx: ContextMenuRootContext | undefined;
  if (parent.value.type === 'context-menu') {
    ctx = parent.value.context;
  }

  if (ctx) {
    ctx.positionerRef.value = positionerElement.value;
    watch(
      () => positionerElement.value,
      (v) => {
        ctx.positionerRef.value = v;
      },
      {flush: 'post', immediate: true},
    );
    if (ctx.actionsRef) {
      ctx.actionsRef.value = {setOpen};
    }
  }

  const dismiss = useDismiss(floatingRootContext, {
    enabled: !disabled.value,
    bubbles: {escapeKey: closeParentOnEsc && parent.value.type === 'menu'},
    outsidePress() {
      if (parent.value.type !== 'context-menu' || openEventRef.value?.type === 'contextmenu') {
        return true;
      }

      return allowOutsidePressDismissalRef.value;
    },
    externalTree: nested ? floatingTreeRoot.value : undefined,
  });

  const direction = useDirection();

  const setActiveIndex = (index: number | null) => {
    if (store.select('activeIndex') === index) {
      return;
    }
    store.set('activeIndex', index);
  };

  const listNavigation = useListNavigation(floatingRootContext, {
    enabled: !disabled.value,
    listRef: store.context.itemDomElements,
    activeIndex: activeIndex.value,
    nested: parent.value.type !== undefined,
    loopFocus,
    orientation,
    parentOrientation: parent.value.type === 'menubar' ? parent.value.context.orientation : undefined,
    rtl: direction.value === 'rtl',
    disabledIndices: EMPTY_ARRAY,
    onNavigate: setActiveIndex,
    openOnArrowKeyDown: parent.value.type !== 'context-menu',
    externalTree: nested ? floatingTreeRoot.value : undefined,
    focusItemOnHover: highlightItemOnHoverComputed.value,
  });

  const onTyping = (nextTyping: boolean) => {
    store.context.typingRef.value = nextTyping;
  };

  const typeahead = useTypeahead(floatingRootContext, {
    enabled: !disabled.value,
    listRef: store.context.itemLabels,
    elementsRef: store.context.itemDomElements,
    activeIndex: activeIndex.value,
    resetMs: TYPEAHEAD_RESET_MS,
    onMatch: (index: number) => {
      if (open.value && index !== activeIndex.value) {
        store.set('activeIndex', index);
      }
    },
    onTyping,
  });

  const activeTriggerProps = (() => {
    const mergedProps = mergeProps(
      typeahead.reference,
      listNavigation.reference,
      dismiss.reference,
      {
        onMouseMove() {
          store.set('allowMouseEnter', true);
        },
      },
      interactionTypeProps,
    );

    mergedProps['aria-haspopup'] = 'menu';
    mergedProps['aria-expanded'] = open.value;

    return mergedProps;
  })();

  const inactiveTriggerProps = (() => {
    const mergedProps = mergeProps(listNavigation.trigger, dismiss.trigger, interactionTypeProps);

    mergedProps['aria-haspopup'] = 'menu';
    mergedProps['aria-expanded'] = false;

    return mergedProps;
  })();

  // The initial render has no store subscribers yet. Seed these props before triggers render so
  // the synchronization effect below doesn't make every trigger render twice in the first commit.
  useRefWithInit(() => {
    store.update({inactiveTriggerProps} as any);
    return null;
  });

  const popupProps = (() => {
    const merged = mergeProps(
      FOCUSABLE_POPUP_PROPS,
      {
        id: floatingId,
        role: 'menu' as const,
        'aria-labelledby': activeTriggerElement.value?.id,
        onMouseMove() {
          store.set('allowMouseEnter', true);
          if (parent.value.type === 'menu') {
            store.set('hoverEnabled', false);
          }
        },
        onClick() {
          if (store.select('hoverEnabled')) {
            store.set('hoverEnabled', false);
          }
        },
        onKeyDown(event: any) {
          // The Menubar's CompositeRoot captures keyboard events via
          // event delegation.
          const relay = store.select('keyboardEventRelay');
          if (relay && !event.isPropagationStopped()) {
            relay(event);
          }
        },
      },
      typeahead.floating,
      listNavigation.floating,
      dismiss.floating,
    );

    return merged;
  })();

  const itemProps = listNavigation.item ?? EMPTY_OBJECT;

  usePopupInteractionProps(store, {
    floatingRootContext,
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
    itemProps,
  } as any);

  const context: MenuRootContext<Payload> = {
    store,
    parent: parentFromContext,
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // PD-15：children 必须 render 期求值（setup 快照会让动态 children——
  // 如条件渲染的 Trigger——永远停留首次渲染）。render prop（({payload}) =>
  // ...）直接函数调用。
  const content = computed(() => {
    const rawChildren = props.children;
    return typeof rawChildren === 'function' ? rawChildren({payload: payload.value}) : rawChildren;
  });

  const provider = (
    <>
      <MenuRootContext.Provider value={context as MenuRootContext}>
        {props.handle && <PopupHandleAttachment handle={props.handle} store={store} />}
        {content.value}
      </MenuRootContext.Provider>
    </>
  );

  // set up a FloatingTree to provide the context to nested menus
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {parent.value.type === undefined || parent.value.type === 'context-menu' ? (
        <FloatingTree externalTree={floatingTreeRoot.value}>{provider}</FloatingTree>
      ) : (
        provider
      )}
    </>
  );
}

function useMenuRootStore<Payload>(
  initialState: Partial<MenuStoreState<Payload>>,
  floatingId: string | undefined,
  nested: boolean,
) {
  // The store is owned by this Root instance and created exactly once.
  const store = useRefWithInit(
    () => new MenuStore<Payload>(initialState, floatingId, nested),
  ).value;

  return store;
}

export interface MenuRootState {}

export interface MenuRootProps<Payload = unknown> {
  /**
   * Whether the menu is initially open.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Determines if the menu enters a modal state when open.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the menu is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the menu is currently open.
   */
  open?: boolean | undefined;
  /**
   * The visual orientation of the menu.
   * @default 'vertical'
   */
  orientation?: MenuRoot.Orientation | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When in a submenu, determines whether pressing the Escape key
   * closes the entire menu, or only the current child menu.
   * @default false
   */
  closeParentOnEsc?: boolean | undefined;
  /**
   * A ref to imperative actions.
   */
  actionsRef?: {value: MenuRoot.Actions | null} | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the menu with a trigger.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * The content of the menu.
   */
  children?: any;
}

export interface MenuRootActions {
  unmount: () => void;
  close: () => void;
}

export type MenuRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.focusOut
  | typeof REASONS.listNavigation
  | typeof REASONS.escapeKey
  | typeof REASONS.itemPress
  | typeof REASONS.closePress
  | typeof REASONS.siblingOpen
  | typeof REASONS.cancelOpen
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type MenuRootChangeEventDetails = BaseUIChangeEventDetails<MenuRoot.ChangeEventReason> & {
  preventUnmountOnClose(): void;
};

export type MenuRootOrientation = 'horizontal' | 'vertical';

export type MenuParent =
  | {
      type: 'menu';
      store: MenuStore<unknown>;
    }
  | {
      type: 'menubar';
      context: MenubarContext;
    }
  | {
      type: 'context-menu';
      context: ContextMenuRootContext;
    }
  | {
      type: 'nested-context-menu';
      context: ContextMenuRootContext;
      menuContext: MenuRootContext;
    }
  | {
      type: undefined;
    };

export namespace MenuRoot {
  export type State = MenuRootState;
  export type Props<Payload = unknown> = MenuRootProps<Payload>;
  export type Actions = MenuRootActions;
  export type ChangeEventReason = MenuRootChangeEventReason;
  export type ChangeEventDetails = MenuRootChangeEventDetails;
  export type Orientation = MenuRootOrientation;
}

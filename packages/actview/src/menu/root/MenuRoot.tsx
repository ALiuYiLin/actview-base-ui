import { computed, watch } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { useId } from '@base-ui/actview-utils/useId';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import {
  FloatingTree,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useListNavigation,
  useTypeahead,
  useSyncedFloatingRootContext,
} from '../../floating-ui-actview';
import { MenuRootContext, useMenuRootContext } from './MenuRootContext';
import { MenubarContext, useMenubarContext } from '../../menubar/MenubarContext';
import { TYPEAHEAD_RESET_MS } from '../../internals/constants';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  ContextMenuRootContext,
  useContextMenuRootContext,
} from '../../context-menu/root/ContextMenuRootContext';
import { mergeProps } from '../../merge-props';
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
} from '../../utils/popups';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';

/**
 * Groups all parts of the menu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRoot<Payload>(componentProps: MenuRoot.Props<Payload>) {
  const { actionsRef, handle } = componentProps;

  const contextMenuContext = useContextMenuRootContext(true);
  const parentMenuRootContext = useMenuRootContext(true);
  const menubarContext = useMenubarContext(true);
  const isSubmenu = useMenuSubmenuRootContext();

  const parentFromContext = computed<MenuParent>(() => {
    if (isSubmenu.value && parentMenuRootContext.value) {
      return {
        type: 'menu',
        store: parentMenuRootContext.value.store,
      };
    }

    if (menubarContext.value) {
      return {
        type: 'menubar',
        context: menubarContext.value,
      };
    }

    // Ensure this is not a Menu nested inside ContextMenu.Trigger.
    // ContextMenu parentContext is always undefined as ContextMenu.Root is instantiated with
    // <MenuRootContext.Provider value={undefined}>
    if (contextMenuContext.value && !parentMenuRootContext.value) {
      return {
        type: 'context-menu',
        context: contextMenuContext.value,
      };
    }

    return {
      type: undefined,
    };
  });

  const rootId = useId();
  const floatingId = useId();
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  const store = useRefWithInit(
    () =>
      new MenuStore<Payload>(
        {
          open: componentProps.defaultOpen ?? false,
          openProp: componentProps.open,
          activeTriggerId: componentProps.defaultTriggerId ?? null,
          triggerIdProp: componentProps.triggerId,
          parent: parentFromContext.value,
          disabled: componentProps.disabled ?? false,
          highlightItemOnHover: componentProps.highlightItemOnHover ?? true,
          modal: parentFromContext.value.type === undefined ? componentProps.modal : undefined,
          rootId,
        },
        floatingId,
        floatingParentNodeIdFromContext != null,
      ),
  ).current;

  store.useControlledProp('openProp', computed(() => componentProps.open));
  store.useControlledProp('triggerIdProp', computed(() => componentProps.triggerId));

  // `useContextCallback` assigns once in ActView; keep the context callback fresh via a watcher
  // so prop changes after mount are honored.
  watch(
    () => componentProps.onOpenChangeComplete,
    (callback) => {
      store.context.onOpenChangeComplete = callback;
    },
    { immediate: true },
  );

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
  const payload = store.useState('payload');
  const floatingParentNodeId = store.useState('floatingParentNodeId');

  const openEventRef = { current: null as Event | null };
  const allowOutsidePressDismissalRef = { current: parentFromContext.value.type !== 'context-menu' };
  const allowOutsidePressDismissalTimeout = useTimeout();
  const allowTouchToCloseRef = { current: true };
  const allowTouchToCloseTimeout = useTimeout();

  const nested = floatingParentNodeId.value != null;

  if (process.env.NODE_ENV !== 'production') {
    if (parentFromContext.value.type !== undefined && componentProps.modal !== undefined) {
      console.warn(
        'Base UI: The `modal` prop is not supported on nested menus. It will be ignored.',
      );
    }
  }

  const { openMethod, triggerProps: interactionTypeProps } = useOpenInteractionType(open);

  store.useSyncedValues({
    disabled: computed(() => componentProps.disabled ?? false),
    highlightItemOnHover: computed(() => componentProps.highlightItemOnHover ?? true),
    modal: computed(() => (parent.value.type === undefined ? componentProps.modal : undefined)),
    openMethod,
    rootId: computed(() => rootId),
  });

  useImplicitActiveTrigger(store);
  const { forceUnmount } = useOpenStateTransitions(open, store, () => {
    store.set('allowMouseEnter', false);
  });

  // The React version runs these in layout effects; ActView setup runs once, so `watch` with
  // `immediate` covers both the initial sync and later changes.
  watch(
    [() => parent.value.type, () => contextMenuContext.value, () => parentMenuRootContext.value],
    () => {
      if (contextMenuContext.value && !parentMenuRootContext.value) {
        // This is a context menu root.
        // It doesn't support detached triggers yet, so we have to sync the parent context manually.
        store.update({
          parent: {
            type: 'context-menu',
            context: contextMenuContext.value,
          },
          floatingNodeId: floatingNodeIdFromContext,
          floatingParentNodeId: floatingParentNodeIdFromContext,
        });
      } else if (parentMenuRootContext.value) {
        store.update({
          floatingNodeId: floatingNodeIdFromContext,
          floatingParentNodeId: floatingParentNodeIdFromContext,
        });
      }
    },
    { immediate: true },
  );

  watch([open, () => parent.value.type], () => {
    if (!open.value) {
      openEventRef.current = null;
    }

    if (parent.value.type !== 'context-menu') {
      return;
    }

    if (!open.value) {
      allowOutsidePressDismissalTimeout.clear();
      allowOutsidePressDismissalRef.current = false;
      return;
    }

    // With `mousedown` outside press events and long press touch input, there
    // needs to be a grace period after opening to ensure the dismissal event
    // doesn't fire immediately after open.
    allowOutsidePressDismissalTimeout.start(500, () => {
      allowOutsidePressDismissalRef.current = true;
    });
  });

  watch([open, hoverEnabled], () => {
    if (!open.value && !hoverEnabled.value) {
      store.set('hoverEnabled', true);
    }
  });

  const setOpen = (
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

    componentProps.onOpenChange?.(nextOpen, eventDetails as MenuRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);

    const nativeEvent = eventDetails.event as Event;
    if (
      nextOpen === false &&
      nativeEvent?.type === 'click' &&
      (nativeEvent as PointerEvent).pointerType === 'touch' &&
      !allowTouchToCloseRef.current
    ) {
      return;
    }

    // Prevent the menu from closing on mobile devices that have a delayed click event.
    // In some cases the menu, when tapped, will fire the focus event first and then the click event.
    // Without this guard, the menu will close immediately after opening.
    if (nextOpen && reason === REASONS.triggerFocus) {
      allowTouchToCloseRef.current = false;
      allowTouchToCloseTimeout.start(300, () => {
        allowTouchToCloseRef.current = true;
      });
    } else {
      allowTouchToCloseRef.current = true;
      allowTouchToCloseTimeout.clear();
    }

    // Keyboard and assistive-technology activations produce `detail === 0` clicks;
    // mouse-gesture clicks (including the synthesized drag-release click from
    // `useMenuItemCommonProps`) carry `detail >= 1`.
    const isKeyboardClick =
      (reason === REASONS.triggerPress || reason === REASONS.itemPress) &&
      (nativeEvent as MouseEvent).detail === 0;
    const isDismissClose = !nextOpen && (reason === REASONS.escapeKey || reason == null);

    openEventRef.current = eventDetails.event;

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
  };

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    floatingRootContext: store.state.floatingRootContext,
    floatingId,
    nested: floatingParentNodeIdFromContext != null,
    onOpenChange: setOpen,
  });

  const floatingEvents = floatingRootContext.context.events;

  // Registered in a layout effect (not a passive one) so `setOpen` emits from imperative
  // `MenuHandle.open()` calls made in the same commit this root mounts — e.g. from another layout
  // effect during a route-transition handoff — are received instead of being silently dropped.
  useIsoLayoutEffect(() => {
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
  });

  const handleImperativeClose = () => {
    store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction));
  };

  if (actionsRef) {
    actionsRef.current = { unmount: forceUnmount, close: handleImperativeClose };
  }

  // Sync the context-menu refs (React does this with `useImperativeHandle`).
  watch(
    [() => parent.value.type, () => positionerElement.value],
    () => {
      if (parent.value.type === 'context-menu') {
        parent.value.context.positionerRef.current = positionerElement.value;
        parent.value.context.actionsRef.current = { setOpen };
      }
    },
    { immediate: true },
  );

  const dismiss = useDismiss(floatingRootContext, {
    enabled: !disabled.value,
    bubbles: { escapeKey: componentProps.closeParentOnEsc && parentFromContext.value.type === 'menu' },
    outsidePress() {
      if (parentFromContext.value.type !== 'context-menu' || openEventRef.current?.type === 'contextmenu') {
        return true;
      }

      return allowOutsidePressDismissalRef.current;
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
    nested: parentFromContext.value.type !== undefined,
    loopFocus: componentProps.loopFocus ?? true,
    orientation: componentProps.orientation,
    parentOrientation:
      parentFromContext.value.type === 'menubar'
        ? parentFromContext.value.context.orientation
        : undefined,
    rtl: direction.value === 'rtl',
    disabledIndices: EMPTY_ARRAY,
    onNavigate: setActiveIndex,
    openOnArrowKeyDown: parentFromContext.value.type !== 'context-menu',
    externalTree: nested ? floatingTreeRoot.value : undefined,
    focusItemOnHover: componentProps.highlightItemOnHover ?? true,
  });

  const onTyping = (nextTyping: boolean) => {
    store.context.typingRef.current = nextTyping;
  };

  const typeahead = useTypeahead(floatingRootContext, {
    enabled: !disabled.value,
    listRef: store.context.itemLabels,
    elementsRef: store.context.itemDomElements,
    activeIndex: activeIndex.value,
    resetMs: TYPEAHEAD_RESET_MS,
    onMatch: (index) => {
      if (open.value && index !== activeIndex.value) {
        store.set('activeIndex', index);
      }
    },
    onTyping,
  });

  const activeTriggerProps = computed<Record<string, any>>(() => {
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
  });

  const inactiveTriggerProps = computed<Record<string, any>>(() => {
    const mergedProps = mergeProps(listNavigation.trigger, dismiss.trigger, interactionTypeProps);

    mergedProps['aria-haspopup'] = 'menu';
    mergedProps['aria-expanded'] = false;

    return mergedProps;
  });

  // The initial render has no store subscribers yet. Seed these props before triggers render so
  // the synchronization effect below doesn't make every trigger render twice in the first commit.
  useRefWithInit(() => {
    store.update({ inactiveTriggerProps: inactiveTriggerProps.value });
    return null;
  });

  const popupProps = computed<Record<string, any>>(() =>
    mergeProps(
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
        onKeyDown(event: KeyboardEvent) {
          // The Menubar's CompositeRoot captures keyboard events via
          // event delegation. This works well when Menu.Root is nested inside Menubar,
          // but with detached triggers we need to manually forward the event to the CompositeRoot.
          const relay = store.select('keyboardEventRelay');
          if (relay) {
            relay(event);
          }
        },
      },
      typeahead.floating,
      listNavigation.floating,
      dismiss.floating,
    ),
  );

  const itemProps = listNavigation.item ?? EMPTY_OBJECT;

  usePopupInteractionProps(store, {
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
    itemProps: computed(() => itemProps),
  } as any);

  const contextValue = computed<MenuRootContext<Payload>>(() => ({
    store,
    parent: parentFromContext.value,
  }));

  const content = (
    <MenuRootContext.Provider value={contextValue}>
      {handle && <PopupHandleAttachment handle={handle} store={store} />}
      {typeof componentProps.children === 'function'
        ? componentProps.children({ payload: payload.value as Payload | undefined })
        : componentProps.children}
    </MenuRootContext.Provider>
  );

  if (parentFromContext.value.type === undefined || parentFromContext.value.type === 'context-menu') {
    // set up a FloatingTree to provide the context to nested menus
    return <FloatingTree externalTree={floatingTreeRoot.value}>{content}</FloatingTree>;
  }

  // Must end with JSX (not a bare expression) so the Babel transform converts this component
  // (AI-003); a final `return content` keeps it a bare function and the renderer treats it as
  // a native element → DOMException.
  return <>{content}</>;
}

export interface MenuRootState {}

export interface MenuRootProps<Payload = unknown> {
  /**
   * Whether the menu is initially open.
   *
   * To render a controlled menu, use the `open` prop instead.
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
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Determines if the menu enters a modal state when open.
   * - `true`: user interaction is limited to the menu: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   *
   * Nested menus ignore this prop, and menus opened by hover are never modal.
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
   * Controls whether roving focus uses up/down or left/right arrow keys.
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
   * - `unmount`: Manually unmounts the menu.
   *   Call this after any externally controlled closing animation finishes.
   * - `close`: When specified, the menu can be closed imperatively.
   */
  actionsRef?: { current?: MenuRoot.Actions | null; value?: MenuRoot.Actions | null } | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled menu.
   * There's no need to specify this prop when the menu is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the menu is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open menu.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the menu with a trigger.
   * If specified, allows external triggers to control the menu's open state.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * The content of the menu.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: VNodeChild | PayloadChildRenderFunction<Payload>;
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

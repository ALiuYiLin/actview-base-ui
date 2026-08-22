import { computed, onUnmounted, watch } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { useDismiss, FloatingTree } from '@/floating-ui-actview';
import { PopoverRootContext, usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import { PopoverStore, type State as PopoverStoreState } from '@/popover/store/PopoverStore';
import { PopoverHandle } from '@/popover/store/PopoverHandle';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import {
  useImplicitActiveTrigger,
  usePopupRootStore,
  useOpenStateTransitions,
  usePopupInteractionProps,
  usePopupRootSync,
  type PayloadChildRenderFunction,
} from '@/utils/popups';
import type { RefObject } from '@/internals/types';

/**
 * Groups all parts of the popover.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverRoot<Payload = unknown>(componentProps: PopoverRoot.Props<Payload>) {
  const {
    children: _children,
    open: _open,
    defaultOpen = false,
    onOpenChange: _onOpenChange,
    onOpenChangeComplete: _onOpenChangeComplete,
    modal: _modal,
    handle,
    triggerId: _triggerId,
    defaultTriggerId: defaultTriggerIdProp = null,
    actionsRef,
  } = componentProps;

  const store = usePopoverRootStore<Payload>(handle, {
    modal: _modal,
    open: defaultOpen,
    openProp: _open,
    activeTriggerId: defaultTriggerIdProp,
    triggerIdProp: _triggerId,
  });

  store.useControlledProp('openProp', computed(() => componentProps.open));
  store.useControlledProp('triggerIdProp', computed(() => componentProps.triggerId));

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload');

  watch(
    () => componentProps.onOpenChange,
    (fn) => {
      store.useContextCallback('onOpenChange', fn);
    },
    { immediate: true },
  );
  watch(
    () => componentProps.onOpenChangeComplete,
    (fn) => {
      store.useContextCallback('onOpenChangeComplete', fn);
    },
    { immediate: true },
  );

  usePopupRootSync(store, open);
  useImplicitActiveTrigger(store);
  const { forceUnmount } = useOpenStateTransitions(open, store, () => {
    store.update({ stickIfOpen: true, openChangeReason: null });
  });

  const modal = computed(() => componentProps.modal ?? false);
  store.useSyncedValues({ modal });

  watch(open, (isOpen) => {
    if (!isOpen) {
      store.context.stickIfOpenTimeout.clear();
    }
  });

  // Attach the store to the handle for the root's lifetime. This mirrors the shared
  // `PopupHandleAttachment` component, which is a plain `.ts` function returning `null` and
  // therefore cannot be used as a JSX component (the ActView Babel transform would not wrap it).
  if (handle) {
    watch(
      () => handle,
      (_value, _oldValue, onCleanup) => {
        const detach = handle.attachStore(store);
        onCleanup(detach);
      },
      { immediate: true },
    );
  }

  if (actionsRef) {
    actionsRef.current = {
      unmount: forceUnmount,
      close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
    };
  }

  const shouldRenderInteractions = computed(() => open.value || mounted.value);

  const getChildren = () => {
    const children = componentProps.children;
    if (typeof children === 'function') {
      return (children as PayloadChildRenderFunction<Payload>)({
        payload: payload.value as Payload | undefined,
      });
    }
    return children;
  };

  if (usePopoverRootContext(true).value) {
    return (
      <PopoverRootContext.Provider value={store}>
        {shouldRenderInteractions.value && (
          <PopoverInteractions store={store} modal={modal.value} />
        )}
        {getChildren()}
      </PopoverRootContext.Provider>
    );
  }

  return (
    <FloatingTree>
      <PopoverRootContext.Provider value={store}>
        {shouldRenderInteractions.value && (
          <PopoverInteractions store={store} modal={modal.value} />
        )}
        {getChildren()}
      </PopoverRootContext.Provider>
    </FloatingTree>
  );
}

function usePopoverRootStore<Payload>(
  handle: PopoverHandle<Payload> | undefined,
  initialState: Partial<PopoverStoreState<Payload>>,
) {
  // The store is owned by this Root instance and created exactly once. It is not tied to the handle:
  // the handle attaches to it, so swapping the handle re-attaches rather than recreating state.
  // Default values are only initial values; controlled values and root state are synced after creation.
  const store = usePopupRootStore(
    (floatingId, nested) => new PopoverStore<Payload>(initialState, floatingId, nested),
  );

  // Popover-specific: dispose the patient-click timeout held in the store's context on unmount.
  onUnmounted(store.context.stickIfOpenTimeout.disposeEffect);

  return store;
}

export interface PopoverRootState {}

export interface PopoverRootProps<Payload = unknown> {
  /**
   * Whether the popover is initially open.
   *
   * To render a controlled popover, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the popover is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the popover is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: PopoverRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the popover is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Manually unmounts the popover.
   * Call this after any externally controlled closing animation finishes.
   * - `close`: Closes the popover imperatively when called.
   */
  actionsRef?: RefObject<PopoverRoot.Actions | null> | undefined;
  /**
   * Determines if the popover enters a modal state when open.
   * - `true`: user interaction is limited to the popover: document page scroll is locked, and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * - `'trap-focus'`: focus is trapped inside the popover, but document page scroll is not locked and pointer interactions outside of it remain enabled.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   *
   * When `modal` is `true`, focus trapping is enabled only if `<Popover.Close>` is rendered
   * inside `<Popover.Popup>`. It can be visually hidden with your own CSS if needed, such as
   * Tailwind's `sr-only` utility.
   *
   * When `modal` is `'trap-focus'`, render `<Popover.Close>` inside `<Popover.Popup>` so touch
   * screen readers can escape the popup.
   * @default false
   */
  modal?: boolean | 'trap-focus' | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled popover.
   * There's no need to specify this prop when the popover is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open popover.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the popover with a trigger.
   * If specified, allows external triggers to control the popover's open state.
   */
  handle?: PopoverHandle<Payload> | undefined;
  /**
   * The content of the popover.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: VNodeChild | PayloadChildRenderFunction<Payload>;
}

export interface PopoverRootActions {
  unmount: () => void;
  close: () => void;
}

export type PopoverRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.closePress
  | typeof REASONS.focusOut
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;
export type PopoverRootChangeEventDetails =
  BaseUIChangeEventDetails<PopoverRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace PopoverRoot {
  export type State = PopoverRootState;
  export type Props<Payload = unknown> = PopoverRootProps<Payload>;
  export type Actions = PopoverRootActions;
  export type ChangeEventReason = PopoverRootChangeEventReason;
  export type ChangeEventDetails = PopoverRootChangeEventDetails;
}

function PopoverInteractions({
  store,
  modal,
}: {
  store: PopoverStore<any>;
  modal: boolean | 'trap-focus';
}) {
  const floatingRootContext = store.useState('floatingRootContext');

  const dismiss = useDismiss(floatingRootContext.value, {
    outsidePressEvent: {
      // Ensure `aria-hidden` on outside elements is removed immediately
      // on outside press when trapping focus.
      mouse: modal === 'trap-focus' ? 'sloppy' : 'intentional',
      touch: 'sloppy',
    },
  });

  // `useDismiss` is not given an `enabled` option, so it always returns both prop bags. Restore
  // the `EMPTY_OBJECT` fallbacks if that ever changes: the store fields are non-optional.
  // `dismiss.trigger` is always the same object as `dismiss.reference`.
  const triggerProps = dismiss.reference!;
  // PopoverPopup already spreads `FOCUSABLE_POPUP_PROPS` directly, so the popup
  // props only need to carry the dismiss handlers.
  const popupProps = dismiss.floating!;

  usePopupInteractionProps(store, {
    activeTriggerProps: triggerProps,
    inactiveTriggerProps: triggerProps,
    popupProps,
  });

  return <></>;
}

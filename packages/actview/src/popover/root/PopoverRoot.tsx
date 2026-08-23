import { defineComponent, onUnmounted, ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';
import { useId } from '@/utils/useId';
import {
  useDismiss,
  useFloatingParentNodeId,
  useSyncedFloatingRootContext,
} from '@/floating-ui-react';
import { PopoverRootContext, usePopoverRootContext } from './PopoverRootContext';
import { PopoverStore, type State as PopoverStoreState } from '../store/PopoverStore';
import { PopoverHandle } from '../store/PopoverHandle';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import {
  PopupHandleAttachment,
  useImplicitActiveTrigger,
  usePopupRootStore,
  useOpenStateTransitions,
  usePopupInteractionProps,
  usePopupRootSync,
  type PayloadChildRenderFunction,
} from '@/utils/popups';

/**
 * A component that creates a popover.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export const PopoverRoot = defineComponent(function PopoverRoot<Payload = unknown>(
  props: PopoverRoot.Props<Payload>,
) {
  const {
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onOpenChangeComplete,
    modal = false,
    handle,
    triggerId: triggerIdProp,
    defaultTriggerId: defaultTriggerIdProp = null,
  } = props as any;

  const store = usePopoverRootStore<Payload>(handle, {
    modal,
    open: defaultOpen,
    openProp,
    activeTriggerId: defaultTriggerIdProp,
    triggerIdProp,
  });

  store.useControlledProp('openProp', openProp);
  store.useControlledProp('triggerIdProp', triggerIdProp);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as Ref<Payload | undefined>;

  store.useContextCallback('onOpenChange', onOpenChange);
  store.useContextCallback('onOpenChangeComplete', onOpenChangeComplete);

  usePopupRootSync(store, open as any);
  useImplicitActiveTrigger(store);
  const {forceUnmount} = useOpenStateTransitions(open as any, store, () => {
    store.update({stickIfOpen: true, openChangeReason: null});
  });

  store.useSyncedValues({modal});

  watch(
    () => open.value,
    () => {
      if (!open.value) {
        store.context.stickIfOpenTimeout.clear();
      }
    },
    {flush: 'post', immediate: true},
  );

  if ((props as any).actionsRef) {
    (props as any).actionsRef.value = {
      unmount: forceUnmount,
      close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
    };
    onUnmounted(() => {
      (props as any).actionsRef.value = null;
    });
  }

  const floatingId = useId();
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  function setOpen(nextOpen: boolean, eventDetails: PopoverRoot.ChangeEventDetails) {
    store.setOpen(nextOpen, eventDetails);
  }

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    floatingRootContext: store.state.floatingRootContext,
    floatingId,
    nested: floatingParentNodeIdFromContext != null,
    onOpenChange: setOpen,
  });

  const floatingEvents = floatingRootContext.context.events;

  watch(
    () => [floatingEvents, setOpen] as const,
    () => {
      const handleSetOpenEvent = ({
        open: nextOpen,
        eventDetails,
      }: {
        open: boolean;
        eventDetails: PopoverRoot.ChangeEventDetails;
      }) => setOpen(nextOpen, eventDetails);

      floatingEvents.on('setOpen', handleSetOpenEvent);

      return () => {
        floatingEvents?.off('setOpen', handleSetOpenEvent);
      };
    },
    {flush: 'post', immediate: true},
  );

  const shouldRenderInteractions = () => open.value || mounted.value;

  return () => {
    const child = toValue(children);
    return (
      <PopoverRootContext.Provider value={store as unknown as PopoverRootContext<unknown>}>
        {handle && <PopupHandleAttachment handle={handle} store={store} />}
        {shouldRenderInteractions() && <PopoverInteractions store={store} modal={modal} />}
        {typeof child === 'function' ? child({payload: payload.value}) : child}
      </PopoverRootContext.Provider>
    );
  };
});

function usePopoverRootStore<Payload>(
  handle: PopoverHandle<Payload> | undefined,
  initialState: Partial<PopoverStoreState<Payload>>,
) {
  const store = usePopupRootStore(
    (floatingId: string | undefined, nested: boolean) =>
      new PopoverStore<Payload>(initialState, floatingId, nested),
  );

  onUnmounted(() => store.context.stickIfOpenTimeout.disposeEffect?.());

  return store;
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

  const triggerProps = dismiss.reference!;
  const popupProps = dismiss.floating!;

  usePopupInteractionProps(store, {
    activeTriggerProps: triggerProps,
    inactiveTriggerProps: triggerProps,
    popupProps,
  });

  return null;
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
   * - `close`: Closes the popover imperatively when called.
   */
  actionsRef?: {value: PopoverRoot.Actions | null} | undefined;
  /**
   * Determines if the popover enters a modal state when open.
   * @default false
   */
  modal?: boolean | 'trap-focus' | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   */
  defaultTriggerId?: string | null | undefined;
  /**
   * A handle to associate the popover with a trigger.
   */
  handle?: PopoverHandle<Payload> | undefined;
  /**
   * The content of the popover.
   */
  children?: any;
  [key: string]: any;
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
export type PopoverRootChangeEventDetails = BaseUIChangeEventDetails<PopoverRoot.ChangeEventReason> & {
  preventUnmountOnClose(): void;
};

export namespace PopoverRoot {
  export type State = PopoverRootState;
  export type Props<Payload = unknown> = PopoverRootProps<Payload>;
  export type Actions = PopoverRootActions;
  export type ChangeEventReason = PopoverRootChangeEventReason;
  export type ChangeEventDetails = PopoverRootChangeEventDetails;
}

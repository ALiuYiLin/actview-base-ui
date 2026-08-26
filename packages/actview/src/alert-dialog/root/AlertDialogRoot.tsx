import { defineComponent, onUnmounted, ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';
import { useId } from '@/utils/useId';
import { useStableCallback } from '@/utils/useStableCallback';
import { useDismiss, useFloatingParentNodeId, useSyncedFloatingRootContext } from '@/floating-ui-react';
import { DialogRootContext, useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { DialogStore, type State as DialogStoreState } from '@/dialog/store/DialogStore';
import { type DialogHandle } from '@/dialog/store/DialogHandle';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import {
  attachPreventUnmountOnClose,
  createPopupOpenState,
  PopupHandleAttachment,
  useImplicitActiveTrigger,
  usePopupRootStore,
  useOpenStateTransitions,
  usePopupInteractionProps,
  usePopupRootSync,
  type PayloadChildRenderFunction,
} from '@/utils/popups';

/**
 * Groups all parts of the AlertDialog.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI AlertDialog](https://base-ui.com/react/components/AlertDialog)
 */
export function AlertDialogRoot<Payload>(props: AlertDialogRoot.Props<Payload>) {
  const {
    open: openProp,
    defaultOpen = false,
    modal = true,
    disablePointerDismissal = false,
    onOpenChange,
    onOpenChangeComplete,
    actionsRef,
    handle,
    triggerId: triggerIdProp,
    defaultTriggerId: defaultTriggerIdProp = null,
  } = props as any;

  const store = useAlertDialogRootStore<Payload>(handle, {
    open: defaultOpen,
    openProp,
    activeTriggerId: defaultTriggerIdProp,
    role: 'alertdialog',
    triggerIdProp,
  });

  store.useControlledProp('openProp', openProp);
  store.useControlledProp('triggerIdProp', triggerIdProp);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as Ref<Payload | undefined>;

  store.useContextCallback('onOpenChange', onOpenChange);
  store.useContextCallback('onOpenChangeComplete', onOpenChangeComplete);

  store.useSyncedValues({modal, disablePointerDismissal} as any);

  usePopupRootSync(store, open as any);
  useImplicitActiveTrigger(store as any);
  const {forceUnmount} = useOpenStateTransitions(open as any, store as any);

  if (actionsRef) {
    actionsRef.value = {
      unmount: forceUnmount,
      close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
    };
  }

  onUnmounted(() => {
    if (actionsRef) {
      actionsRef.value = null;
    }
  });

  const floatingId = useId();
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  const activeTriggerElement = store.useState('activeTriggerElement');
  const openChangeReason = store.useState('openChangeReason' as any);

  const setOpen = useStableCallback(
    (
      nextOpen: boolean,
      eventDetails: Omit<AlertDialogRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
    ) => {
      const reason = eventDetails.reason;

      if (!nextOpen && !store.select('open')) {
        return;
      }

      if (
        open.value === nextOpen &&
        eventDetails.trigger === activeTriggerElement.value &&
        openChangeReason.value === reason
      ) {
        return;
      }

      const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(
        eventDetails as AlertDialogRoot.ChangeEventDetails,
      );

      if (!nextOpen && eventDetails.trigger == null) {
        eventDetails.trigger = activeTriggerElement.value ?? undefined;
      }

      onOpenChange?.(nextOpen, eventDetails as AlertDialogRoot.ChangeEventDetails);

      if ((eventDetails as any).isCanceled) {
        return;
      }

      store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);

      const nativeEvent = eventDetails.event as Event;

      const isKeyboardClick =
        reason === REASONS.triggerPress && (nativeEvent as MouseEvent).detail === 0;
      const isDismissClose = !nextOpen && (reason === REASONS.escapeKey || reason == null);

      const popupOpenState = createPopupOpenState(
        store.state,
        nextOpen,
        eventDetails.trigger,
        shouldPreventUnmountOnClose(),
      ) as ReturnType<typeof createPopupOpenState> & {
        openChangeReason: AlertDialogRoot.ChangeEventReason;
      };

      popupOpenState.openChangeReason = reason as any;
      store.update(popupOpenState as any);

      let openMethod: DialogStoreState<unknown>['openMethod'];
      if (isKeyboardClick) {
        openMethod = 'keyboard';
      } else if (reason === REASONS.triggerPress) {
        openMethod = 'mouse';
      } else {
        openMethod = null;
      }
      store.set('openMethod', openMethod);
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

  watch(
    () => [floatingEvents, setOpen] as const,
    () => {
      const handleSetOpenEvent = ({
        open: nextOpen,
        eventDetails,
      }: {
        open: boolean;
        eventDetails: AlertDialogRoot.ChangeEventDetails;
      }) => setOpen(nextOpen, eventDetails);

      floatingEvents.on('setOpen', handleSetOpenEvent);

      return () => {
        floatingEvents?.off('setOpen', handleSetOpenEvent);
      };
    },
    {flush: 'post', immediate: true},
  );

  const shouldRenderInteractions = () => open.value || mounted.value;

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children/payload 渲染期读取（PD-15）——IIFE
  return (
    <DialogRootContext.Provider value={store as unknown as DialogRootContext<unknown>}>
      {handle && <PopupHandleAttachment handle={handle} store={store} />}
      {shouldRenderInteractions() && <AlertDialogInteractions store={store} modal={modal} />}
      {(() => {
        const child = toValue((props as any).children);
        return typeof child === 'function' ? (child as any)({payload: payload.value}) : child;
      })()}
    </DialogRootContext.Provider>
  );
}

function useAlertDialogRootStore<Payload>(
  _handle: DialogHandle<Payload> | undefined,
  initialState: Partial<DialogStoreState<Payload>>,
) {
  const store = usePopupRootStore(
    (floatingId: string | undefined, nested: boolean) =>
      new DialogStore<Payload>(initialState, floatingId, nested),
  );

  return store;
}

function AlertDialogInteractions({
  store,
  modal,
}: {
  store: DialogStore<any>;
  modal: boolean | 'trap-focus';
}) {
  const floatingRootContext = store.useState('floatingRootContext');
  const disablePointerDismissal = store.useState('disablePointerDismissal');

  const dismiss = useDismiss(floatingRootContext.value as any, {
    outsidePress: !disablePointerDismissal.value,
    outsidePressEvent: {
      // Ensure `aria-hidden` on outside elements is removed immediately
      // on outside press when trapping focus.
      mouse: modal === 'trap-focus' ? 'sloppy' : 'intentional',
      touch: 'sloppy',
    },
  });

  const triggerProps = dismiss.reference ?? {};
  const popupProps = dismiss.floating ?? {};
  usePopupInteractionProps(store as any, {
    activeTriggerProps: triggerProps,
    inactiveTriggerProps: triggerProps,
    popupProps,
  });

  return null;
}

export interface AlertDialogRootState {}

export interface AlertDialogRootProps<Payload = unknown> {
  /**
   * Whether the AlertDialog is currently open.
   */
  open?: boolean | undefined;
  /**
   * Whether the AlertDialog is initially open.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Determines if the AlertDialog enters a modal state when open.
   * @default true
   */
  modal?: boolean | 'trap-focus' | undefined;
  /**
   * Event handler called when the AlertDialog is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AlertDialogRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the AlertDialog is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether to prevent the AlertDialog from closing on outside presses.
   * @default false
   */
  disablePointerDismissal?: boolean | undefined;
  /**
   * A ref to imperative actions.
   */
  actionsRef?: {value: AlertDialogRoot.Actions | null} | undefined;
  /**
   * A handle to associate the AlertDialog with a trigger.
   */
  handle?: DialogHandle<Payload> | undefined;
  /**
   * The content of the AlertDialog.
   */
  children?: any;
  /**
   * ID of the trigger that the AlertDialog is associated with.
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the AlertDialog is associated with.
   */
  defaultTriggerId?: string | null | undefined;
  [key: string]: any;
}

export interface AlertDialogRootActions {
  unmount: () => void;
  close: () => void;
}

export type AlertDialogRootChangeEventReason =
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.closePress
  | typeof REASONS.focusOut
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type AlertDialogRootChangeEventDetails =
  BaseUIChangeEventDetails<AlertDialogRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace AlertDialogRoot {
  export type State = AlertDialogRootState;
  export type Props<Payload = unknown> = AlertDialogRootProps<Payload>;
  export type Actions = AlertDialogRootActions;
  export type ChangeEventReason = AlertDialogRootChangeEventReason;
  export type ChangeEventDetails = AlertDialogRootChangeEventDetails;
}

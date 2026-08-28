import { computed, onUnmounted, watch } from 'actview';
import type { Ref } from 'actview';
import { useId } from '@/utils/useId';
import { useStableCallback } from '@/utils/useStableCallback';
import {
  useDismiss,
  useFloatingParentNodeId,
  useSyncedFloatingRootContext,
} from '@/floating-ui-react';
import { PopoverRootContext } from './PopoverRootContext';
import { PopoverStore, type State as PopoverStoreState } from '../store/PopoverStore';
import { PopoverHandle } from '../store/PopoverHandle';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { PATIENT_CLICK_THRESHOLD } from '@/internals/constants';
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
 * A component that creates a popover.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverRoot<Payload = unknown>(props: PopoverRoot.Props<Payload>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）；
  // 回调类 props（onOpenChange 等）事件期直读 props。
  const modal = computed(() => props.modal ?? false);

  const store = usePopoverRootStore<Payload>(props.handle, {
    modal: modal.value as any,
    open: props.defaultOpen ?? false,
    openProp: props.open,
    activeTriggerId: props.defaultTriggerId ?? null,
    triggerIdProp: props.triggerId,
  });

  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as Ref<Payload | undefined>;

  store.useContextCallback('onOpenChange', (...args: any[]) => props.onOpenChange?.(...(args as [boolean, PopoverRoot.ChangeEventDetails])));
  store.useContextCallback('onOpenChangeComplete', (...args: any[]) => props.onOpenChangeComplete?.(...(args as [boolean])));

  usePopupRootSync(store, open as any);
  useImplicitActiveTrigger(store);
  const {forceUnmount} = useOpenStateTransitions(open as any, store, () => {
    store.update({stickIfOpen: true, openChangeReason: null});
  });

  store.useSyncedValues({modal} as any);

  watch(
    () => open.value,
    () => {
      if (!open.value) {
        store.context.stickIfOpenTimeout.clear();
      }
    },
    {flush: 'post', immediate: true},
  );

  // actionsRef：ref 对象事件期直读（prop 变化时写入最新对象）。
  watch(
    () => props.actionsRef,
    (actionsRefObj) => {
      if (actionsRefObj) {
        actionsRefObj.value = {
          unmount: forceUnmount,
          close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
        };
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

  const floatingId = useId();
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  const activeTriggerElement = store.useState('activeTriggerElement');
  const openChangeReason = store.useState('openChangeReason');

  const setOpen = useStableCallback(
    (
      nextOpen: boolean,
      eventDetails: Omit<PopoverRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
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
        openChangeReason.value === reason
      ) {
        return;
      }

      const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(
        eventDetails as PopoverRoot.ChangeEventDetails,
      );

      // Do not immediately reset the activeTriggerId to allow
      // exit animations to play and focus to be returned correctly.
      if (!nextOpen && eventDetails.trigger == null) {
        eventDetails.trigger = activeTriggerElement.value ?? undefined;
      }

      props.onOpenChange?.(nextOpen, eventDetails as PopoverRoot.ChangeEventDetails);

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
        openChangeReason: PopoverRoot.ChangeEventReason;
      };

      popupOpenState.openChangeReason = reason as any;
      store.update(popupOpenState);

      // Only allow "patient" clicks to close the popover if it's open.
      // If they clicked within 500ms of the popover opening, keep it open.
      if (reason === REASONS.triggerHover) {
        store.set('stickIfOpen', true);
        store.context.stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          store.set('stickIfOpen', false);
        });
      } else if (!nextOpen) {
        store.context.stickIfOpenTimeout.clear();
      }

      let instantType: PopoverStoreState<unknown>['instantType'];
      if (isKeyboardClick) {
        instantType = 'click';
      } else if (isDismissClose) {
        instantType = 'dismiss';
      } else if (reason === REASONS.focusOut) {
        instantType = 'focus';
      }
      store.set('instantType', instantType);
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

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children（render-prop 或 vnode）渲染期从 props 直读（表达式内，无 IIFE）。
  return (
    <PopoverRootContext.Provider value={store as unknown as PopoverRootContext<unknown>}>
      {props.handle && <PopupHandleAttachment handle={props.handle} store={store} />}
      {shouldRenderInteractions() && <PopoverInteractions store={store} modal={modal.value} />}
      {typeof props.children === 'function'
        ? (props.children as PayloadChildRenderFunction<Payload>)({payload: payload.value})
        : props.children}
    </PopoverRootContext.Provider>
  );
}

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

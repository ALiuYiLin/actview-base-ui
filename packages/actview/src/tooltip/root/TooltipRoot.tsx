import { computed, onUnmounted, ref, watch } from 'actview';
import type { Ref } from 'actview';
import { useId } from '@/utils/useId';
import { useStableCallback } from '@/utils/useStableCallback';
import { useDismiss, useFloatingParentNodeId, useSyncedFloatingRootContext } from '@/floating-ui-react';
import { TooltipRootContext, useTooltipRootContext } from './TooltipRootContext';
import { TooltipStore, type State as TooltipStoreState } from '../store/TooltipStore';
import { type TooltipHandle } from '../store/TooltipHandle';
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
 * Groups all parts of the tooltip.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipRoot<Payload>(props: TooltipRoot.Props<Payload>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）；
  // 回调类 props（onOpenChange 等）事件期直读 componentProps。
  const disabled = computed(() => props.disabled ?? false);
  const disableHoverablePopup = computed(() => props.disableHoverablePopup ?? false);

  const store = useTooltipRootStore<Payload>(props.handle, {
    open: props.defaultOpen ?? false,
    openProp: props.open,
    activeTriggerId: props.defaultTriggerId ?? null,
    triggerIdProp: props.triggerId,
  });

  // 受控 prop 传 getter：setup 解构的 openProp 是快照，受控值运行时变化
  // （hover 打开链：onOpenChange → 受控 open 更新）不会触发 useControlledProp
  // 的 watch——传 () => props.open 让 watch 追踪 props 代理（PD-15）。
  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  const openState = store.useState('open');
  const open = ref(!disabled.value && openState.value);

  watch(
    () => [openState.value, disabled.value],
    () => {
      open.value = !disabled.value && openState.value;
    },
    {flush: 'post', immediate: true},
  );

  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as Ref<Payload | undefined>;

  store.useContextCallback('onOpenChange', (...args: any[]) =>
    (props.onOpenChange as any)?.(...args));
  store.useContextCallback('onOpenChangeComplete', (...args: any[]) =>
    (props.onOpenChangeComplete as any)?.(...args));

  store.useSyncedValues({
    disabled,
    disableHoverablePopup,
  } as any);

  usePopupRootSync(store as any, open as any);
  useImplicitActiveTrigger(store as any, {closeOnActiveTriggerUnmount: true});
  const {forceUnmount} = useOpenStateTransitions(open as any, store as any);

  // disabled 时关闭已打开的 tooltip
  watch(
    () => [openState.value, disabled.value],
    () => {
      if (openState.value && disabled.value) {
        store.setOpen(false, createChangeEventDetails(REASONS.disabled));
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
  const openChangeReason = store.useState('openChangeReason' as any);

  const setOpen = useStableCallback(
    (
      nextOpen: boolean,
      eventDetails: Omit<TooltipRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
    ) => {
      const reason = eventDetails.reason;

      if (!nextOpen && !store.select('open')) {
        return;
      }

      if (
        openState.value === nextOpen &&
        eventDetails.trigger === activeTriggerElement.value &&
        openChangeReason.value === reason
      ) {
        return;
      }

      const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(
        eventDetails as TooltipRoot.ChangeEventDetails,
      );

      if (!nextOpen && eventDetails.trigger == null) {
        eventDetails.trigger = activeTriggerElement.value ?? undefined;
      }

      props.onOpenChange?.(nextOpen, eventDetails as TooltipRoot.ChangeEventDetails);

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
        openChangeReason: TooltipRoot.ChangeEventReason;
      };

      popupOpenState.openChangeReason = reason as any;
      store.update(popupOpenState);

      let instantType: TooltipStoreState<unknown>['instantType'];
      if (isKeyboardClick || isDismissClose) {
        instantType = 'dismiss';
      } else if (reason === REASONS.triggerHover || reason === REASONS.triggerFocus) {
        instantType = 'delay';
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
        eventDetails: TooltipRoot.ChangeEventDetails;
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
    <TooltipRootContext.Provider value={store as unknown as TooltipRootContext<unknown>}>
      {props.handle && <PopupHandleAttachment handle={props.handle} store={store} />}
      {shouldRenderInteractions() && (
        <TooltipInteractions store={store} disabled={disabled.value} />
      )}
      {typeof props.children === 'function'
        ? (props.children as PayloadChildRenderFunction<Payload>)({payload: payload.value})
        : props.children}
    </TooltipRootContext.Provider>
  );
}

function useTooltipRootStore<Payload>(
  _handle: TooltipHandle<Payload> | undefined,
  initialState: Partial<TooltipStoreState<Payload>>,
) {
  const store = usePopupRootStore(
    (floatingId: string | undefined, nested: boolean) =>
      new TooltipStore<Payload>(initialState, floatingId, nested),
  );

  return store;
}

function TooltipInteractions<Payload>({
  store,
  disabled,
}: {
  store: TooltipStore<Payload>;
  disabled: boolean;
}) {
  const floatingRootContext = store.useState('floatingRootContext');

  const dismiss = useDismiss(floatingRootContext.value as any, {
    enabled: !disabled,
    referencePress: () => store.select('closeOnClick'),
  });

  // actview 简化：无 useClientPoint（trackCursorAxis 的 cursor 追踪未迁移）
  const triggerProps = dismiss.reference ?? {};
  usePopupInteractionProps(store as any, {
    activeTriggerProps: triggerProps,
    inactiveTriggerProps: triggerProps,
    popupProps: dismiss.floating ?? {},
  });

  return null;
}

export interface TooltipRootState {}

export interface TooltipRootProps<Payload = unknown> {
  /**
   * Whether the tooltip is initially open.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the tooltip is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the tooltip is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: TooltipRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the tooltip is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the tooltip contents can be hovered without closing the tooltip.
   * @default false
   */
  disableHoverablePopup?: boolean | undefined;
  /**
   * Determines which axis the tooltip should track the cursor on.
   * @default 'none'
   */
  trackCursorAxis?: 'none' | 'x' | 'y' | 'both' | undefined;
  /**
   * A ref to imperative actions.
   */
  actionsRef?: {value: TooltipRoot.Actions | null} | undefined;
  /**
   * Whether the tooltip is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A handle to associate the tooltip with a trigger.
   */
  handle?: TooltipHandle<Payload> | undefined;
  /**
   * The content of the tooltip.
   */
  children?: any;
  /**
   * ID of the trigger that the tooltip is associated with.
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the tooltip is associated with.
   */
  defaultTriggerId?: string | null | undefined;
  [key: string]: any;
}

export interface TooltipRootActions {
  unmount: () => void;
  close: () => void;
}

export type TooltipRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.disabled
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type TooltipRootChangeEventDetails =
  BaseUIChangeEventDetails<TooltipRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace TooltipRoot {
  export type State = TooltipRootState;
  export type Props<Payload = unknown> = TooltipRootProps<Payload>;
  export type Actions = TooltipRootActions;
  export type ChangeEventReason = TooltipRootChangeEventReason;
  export type ChangeEventDetails = TooltipRootChangeEventDetails;
}

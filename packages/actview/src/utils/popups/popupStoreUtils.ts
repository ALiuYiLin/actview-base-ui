import { onUnmounted, ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';
import type { ReactStore } from '@/internals/store/ReactStore';
import { useStableCallback } from '@/utils/useStableCallback';
import { useId } from '@/utils/useId';
import { useRefWithInit } from '@/utils/useRefWithInit';
import { EMPTY_OBJECT } from '@/utils/empty';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import { FOCUSABLE_ATTRIBUTE } from '@/floating-ui-react/utils/constants';
import { useFloatingParentNodeId } from '@floating-ui/actview';
import {
  useSyncedFloatingRootContext,
  type SyncedFloatingRootContextStore,
} from '@/floating-ui-react/hooks/useSyncedFloatingRootContext';
import { useTransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import type { HTMLProps } from '@/internals/types';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import {
  type PopupStoreState,
  type PopupStoreContext,
  popupStoreSelectors,
  type PopupTriggerDataStore,
} from './store';

export const FOCUSABLE_POPUP_PROPS = {
  tabIndex: -1,
  [FOCUSABLE_ATTRIBUTE]: '',
} satisfies HTMLProps & Record<typeof FOCUSABLE_ATTRIBUTE, string>;

/**
 * Returns the default `initialFocus` resolver for a popup. When opened by touch it focuses the
 * popup element itself to prevent the virtual keyboard from opening (required for Android
 * specifically; iOS handles this automatically). Otherwise it falls back to the default behavior.
 */
export function createDefaultInitialFocus(popupRef: {current: HTMLElement | null}) {
  return (interactionType: InteractionType) =>
    interactionType === 'touch' ? popupRef.current : true;
}

type PopupStoreWithOpen<
  State extends PopupStoreState<unknown>,
  SetOpenEventDetails extends BaseUIChangeEventDetails<string>,
> = PopupTriggerDataStore<State> &
  Pick<SyncedFloatingRootContextStore<State>, 'useSyncedValue'> & {
    setOpen(open: boolean, eventDetails: SetOpenEventDetails): void;
  };

/**
 * The subset of a popup handle that a Root needs to bind its store to. Both the real handle classes
 * and any test double satisfy it.
 */
export interface PopupRootStoreHandle<Store> {
  attachStore(store: Store): () => void;
}

/**
 * Creates and owns a popup store on behalf of a Root part. The store is created exactly once, with
 * controlled props and root state synced separately after creation. Sets up the synced floating
 * root context and returns the store.
 */
export function usePopupRootStore<
  State extends PopupStoreState<unknown>,
  SetOpenEventDetails extends BaseUIChangeEventDetails<string>,
  Store extends PopupStoreWithOpen<State, SetOpenEventDetails>,
>(
  createStore: (floatingId: string | undefined, nested: boolean) => Store,
  treatPopupAsFloatingElement = false,
): Store {
  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  const store = useRefWithInit(() => createStore(floatingId, nested)).current;

  useSyncedFloatingRootContext({
    popupStore: store,
    treatPopupAsFloatingElement,
    floatingRootContext: store.state.floatingRootContext,
    floatingId,
    nested,
    onOpenChange: store.setOpen,
  });

  return store;
}

/**
 * Attaches a Root's store to a handle for this component's committed lifetime.
 */
export function PopupHandleAttachment<Store>({
  handle,
  store,
}: {
  handle: PopupRootStoreHandle<Store>;
  store: Store;
}) {
  watch(
    () => [handle, store] as const,
    () => {
      return handle.attachStore(store);
    },
    {flush: 'post', immediate: true},
  );

  return null;
}

function syncTriggerCount(store: PopupTriggerDataStore<PopupStoreState<unknown>>) {
  const triggerCount = store.context.triggerElements.size;
  if (store.select('open') && store.state.triggerCount !== triggerCount) {
    store.set('triggerCount', triggerCount);
  }
}

/**
 * Returns a stable callback ref that registers/unregisters the trigger element in the store.
 */
export function useTriggerRegistration<State extends PopupStoreState<unknown>>(
  id: string | undefined,
  store: PopupTriggerDataStore<State>,
) {
  const registrationRef = {current: null as {
    store: PopupTriggerDataStore<State>;
    id: string;
    element: Element;
  } | null};

  return useStableCallback((element: Element | null) => {
    const registration = registrationRef.current;

    if (registration !== null) {
      if (
        registration.element === element &&
        registration.store === store &&
        registration.id === id
      ) {
        // Already registered where it belongs, so the caller's migration effect is free on mount.
        return;
      }

      registrationRef.current = null;
      const registeredStore = registration.store;
      if (
        registeredStore.context.triggerElements.getById(registration.id) === registration.element
      ) {
        registeredStore.context.triggerElements.delete(registration.id);
        syncTriggerCount(registeredStore);
      }
    }

    if (element !== null && id !== undefined) {
      registrationRef.current = {store, id, element};
      store.context.triggerElements.add(id, element);
      syncTriggerCount(store);
    }
  });
}

type PopupOpenState = Pick<
  PopupStoreState<unknown>,
  'open' | 'preventUnmountingOnClose' | 'activeTriggerId' | 'activeTriggerElement'
>;

export function createPopupOpenState(
  state: PopupOpenState,
  open: boolean,
  trigger: Element | undefined,
  preventUnmountOnClose = false,
): PopupOpenState {
  let preventUnmountingOnClose = state.preventUnmountingOnClose;
  if (open) {
    // Opening starts a new close cycle, so clear any previous request to keep the popup mounted.
    preventUnmountingOnClose = false;
  } else if (preventUnmountOnClose) {
    preventUnmountingOnClose = true;
  }

  const triggerId = trigger?.id ?? null;
  let activeTriggerId = state.activeTriggerId;
  let activeTriggerElement = state.activeTriggerElement;

  // If a popup is closing, the `trigger` may be undefined.
  // We want to keep the previous value so that exit animations are played and focus is returned correctly.
  if (triggerId || open) {
    activeTriggerId = triggerId;
    activeTriggerElement = trigger ?? null;
  }

  return {
    open,
    preventUnmountingOnClose,
    activeTriggerId,
    activeTriggerElement,
  };
}

export function attachPreventUnmountOnClose(eventDetails: {preventUnmountOnClose(): void}) {
  let preventUnmountOnClose = false;

  eventDetails.preventUnmountOnClose = () => {
    preventUnmountOnClose = true;
  };

  return () => preventUnmountOnClose;
}

export type PayloadChildRenderFunction<Payload> = (arg: {
  payload: Payload | undefined;
}) => any;

export function useTriggerDataForwarding<
  State extends PopupStoreState<unknown>,
  const Key extends keyof Omit<State, 'activeTriggerId' | 'activeTriggerElement'>,
>(
  triggerId: string | undefined,
  triggerElementRef: {value: Element | null},
  store: PopupTriggerDataStore<State>,
  stateUpdates: Pick<State, Key>,
) {
  const isMountedByThisTrigger = store.useState('isMountedByTrigger', triggerId);

  const baseRegisterTrigger = useTriggerRegistration(triggerId, store);

  // Applies trigger-owned state (active-trigger ownership and payload) when the trigger registers.
  // Stable so payload/`stateUpdates` changes do not change the ref identity; it reads the latest
  // closure values when invoked.
  const applyTriggerData = useStableCallback((element: Element) => {
    const open = store.select('open');
    const activeTriggerId = store.select('activeTriggerId');

    if (activeTriggerId === triggerId) {
      const changes = {
        activeTriggerElement: element,
        ...(open ? stateUpdates : null),
      } as Pick<Readonly<State>, Key | 'activeTriggerElement'>;
      store.update(changes);
      return;
    }

    if (activeTriggerId == null && open) {
      // If a popup is already open, a detached trigger can mount before any active trigger
      // has been established. Claim the first registered trigger so trigger-owned focus
      // management and ARIA relationships work.
      const changes = {
        activeTriggerId: triggerId ?? null,
        activeTriggerElement: element,
        ...stateUpdates,
      } as Pick<Readonly<State>, Key | 'activeTriggerId' | 'activeTriggerElement'>;
      store.update(changes);
    }
  });

  // Stable, so the merged ref on the rendered element keeps its identity for the trigger's whole
  // lifetime.
  const registerTrigger = useStableCallback((element: Element | null) => {
    baseRegisterTrigger(element);
    if (element) {
      applyTriggerData(element);
    }
  });

  // A stable ref does not re-fire on a store or id change, so migrate here instead.
  watch(
    () => [store, triggerId, triggerElementRef.value] as const,
    () => {
      registerTrigger(triggerElementRef.value);
      return () => registerTrigger(null);
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [isMountedByThisTrigger.value, store, triggerElementRef.value, ...Object.values(stateUpdates)] as const,
    () => {
      if (isMountedByThisTrigger.value) {
        const changes = {
          activeTriggerElement: triggerElementRef.value,
          ...stateUpdates,
        } as Pick<Readonly<State>, Key | 'activeTriggerElement'>;
        store.update(changes);
      }
    },
    {flush: 'post', immediate: true},
  );

  return {registerTrigger, isMountedByThisTrigger};
}

/**
 * Runs the shared open-change sequence for a popup store: notifies `onOpenChange`,
 * honors cancellation, dispatches the floating root change, maps the reason to an
 * `instantType`, and commits the state update (synchronously for hover so
 * `getAnimations()` observes it).
 */
export function applyPopupOpenChange<
  State extends PopupStoreState<unknown> & {
    instantType?: 'delay' | 'dismiss' | 'focus' | undefined;
  },
  EventDetails extends BaseUIChangeEventDetails<string>,
  ExtraKey extends keyof State = never,
>(
  store: {
    readonly context: Pick<PopupStoreContext<EventDetails>, 'onOpenChange'>;
    readonly state: State;
    update<const Key extends keyof State>(state: Pick<State, Key>): void;
  },
  nextOpen: boolean,
  eventDetails: EventDetails & {preventUnmountOnClose(): void},
  options: {
    onBeforeDispatch?: (() => void) | undefined;
    extraState?: Pick<State, ExtraKey> | undefined;
  } = {},
): void {
  const reason = eventDetails.reason;
  const isHover = reason === REASONS.triggerHover;
  const isFocusOpen = nextOpen && reason === REASONS.triggerFocus;
  const isDismissClose =
    !nextOpen && (reason === REASONS.triggerPress || reason === REASONS.escapeKey);

  const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(eventDetails);

  store.context.onOpenChange?.(nextOpen, eventDetails);

  if (eventDetails.isCanceled) {
    return;
  }

  options.onBeforeDispatch?.();

  store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);

  const changeState = () => {
    const popupOpenState = createPopupOpenState(
      store.state,
      nextOpen,
      eventDetails.trigger,
      shouldPreventUnmountOnClose(),
    );

    const updatedState = {
      ...options.extraState,
      ...popupOpenState,
      ...(isHover || isFocusOpen ? {instantType: 'delay' as const} : null),
      ...(isDismissClose ? {instantType: 'dismiss' as const} : null),
    } as Pick<State, keyof PopupOpenState | ExtraKey | 'instantType'>;

    store.update(updatedState);
  };

  // A hover change must be committed synchronously so `getAnimations()` sees the new state
  // immediately in the `useOpenChangeComplete` listener below. `useStore` subscribers are
  // notified synchronously by `setState`.
  changeState();
}

/**
 * Resolves the active trigger from store state. When no trigger is explicitly set but exactly
 * one trigger is registered, that trigger is used implicitly. This mirrors the behaviour of the
 * `useImplicitActiveTrigger` hook, but is sync and intended for event handlers.
 */
export function getActiveTriggerId(store: PopupTriggerDataStore<PopupStoreState<unknown>>) {
  const state = store.state;
  const triggerId = state.triggerIdProp ?? state.activeTriggerId;
  if (triggerId) {
    return triggerId;
  }
  if (state.triggerCount === 1) {
    const first = store.context.triggerElements.entries().next();
    if (!first.done) {
      return first.value[0];
    }
  }
  return undefined;
}

/**
 * Manages the mounted state of the popup.
 * Sets up the transition status listeners and handles unmounting when needed.
 */
export function useOpenStateTransitions<State extends PopupStoreState<unknown>>(
  open: boolean | Ref<boolean>,
  store: ReactStoreType<State>,
  onUnmount?: () => void,
) {
  const {mounted, setMounted, transitionStatus} = useTransitionStatus(open);
  const preventUnmountingOnClose = store.useState('preventUnmountingOnClose');
  // Opening starts a new close cycle. Clear during render so the close-completion hook below
  // reads the synchronized value on the same pass.
  const syncedPreventUnmountingOnClose = open ? false : preventUnmountingOnClose.value;

  // mounted / transitionStatus 是响应式 ref（useTransitionStatus 内部），
  // useSyncedValues 的对象快照无法跟踪——这里逐个 watch 同步到 store。
  watch(
    () => mounted.value,
    () => {
      store.set('mounted', mounted.value);
    },
    {flush: 'post', immediate: true},
  );
  watch(
    () => transitionStatus.value,
    () => {
      store.set('transitionStatus', transitionStatus.value);
    },
    {flush: 'post', immediate: true},
  );
  watch(
    () => syncedPreventUnmountingOnClose,
    () => {
      store.set('preventUnmountingOnClose', syncedPreventUnmountingOnClose);
    },
    {flush: 'post', immediate: true},
  );

  const forceUnmount = useStableCallback(() => {
    setMounted(false);
    store.update({
      activeTriggerId: null,
      activeTriggerElement: null,
      mounted: false,
      preventUnmountingOnClose: false,
    } as any);
    onUnmount?.();
    store.context.onOpenChangeComplete?.(false);
  });

  useOpenChangeComplete({
    enabled: () => mounted.value && !toValue(open) && !syncedPreventUnmountingOnClose,
    open,
    ref: store.context.popupRef as any,
    onComplete() {
      if (!toValue(open)) {
        forceUnmount();
      }
    },
  });

  return {forceUnmount, transitionStatus};
}

/**
 * Resolves the active trigger id, claiming the only registered trigger implicitly when
 * none is explicitly active. Sync variant for event handlers.
 */
export function useImplicitActiveTrigger<State extends PopupStoreState<unknown>>(
  store: PopupStoreWithOpen<State, BaseUIChangeEventDetails<typeof REASONS.none>>,
  options: {
    closeOnActiveTriggerUnmount?: boolean | undefined;
  } = {},
) {
  const {closeOnActiveTriggerUnmount = false} = options;
  // Distinguishes a trigger that unmounted from a new active trigger that has not hydrated yet.
  const resolvedActiveTriggerIdRef = {current: null as string | null};
  const open = store.useState('open');
  const reactiveTriggerCount = store.useState('triggerCount');
  const activeTriggerId = store.useState('activeTriggerId');
  const reactiveActiveTriggerElement = store.useState('activeTriggerElement');

  watch(
    () => [
      open.value,
      reactiveTriggerCount.value,
      activeTriggerId.value,
      reactiveActiveTriggerElement.value,
    ] as const,
    () => {
      if (!open.value) {
        resolvedActiveTriggerIdRef.current = null;
        if (store.state.triggerCount !== 0) {
          store.set('triggerCount', 0);
        }
        return;
      }

      const triggerCount = store.context.triggerElements.size;
      const stateUpdates = {} as Pick<
        State,
        'triggerCount' | 'activeTriggerId' | 'activeTriggerElement'
      >;

      if (store.state.triggerCount !== triggerCount) {
        stateUpdates.triggerCount = triggerCount;
      }

      const currentActiveTriggerId = store.select('activeTriggerId');
      let lostActiveTriggerId: string | null = null;

      if (currentActiveTriggerId) {
        const activeTriggerElement = store.context.triggerElements.getById(currentActiveTriggerId);
        if (!activeTriggerElement) {
          for (const [triggerId, triggerElement] of store.context.triggerElements.entries()) {
            if (triggerElement === store.state.activeTriggerElement) {
              stateUpdates.activeTriggerId = triggerId;
              stateUpdates.activeTriggerElement = triggerElement;
              resolvedActiveTriggerIdRef.current = triggerId;
              break;
            }
          }

          if (stateUpdates.activeTriggerId === undefined) {
            if (resolvedActiveTriggerIdRef.current === currentActiveTriggerId) {
              lostActiveTriggerId = currentActiveTriggerId;
            } else {
              resolvedActiveTriggerIdRef.current = null;
            }
          }
        } else {
          resolvedActiveTriggerIdRef.current = currentActiveTriggerId;
          if (activeTriggerElement !== store.state.activeTriggerElement) {
            stateUpdates.activeTriggerElement = activeTriggerElement;
          }
        }
      } else {
        resolvedActiveTriggerIdRef.current = null;
      }

      if (!lostActiveTriggerId && !currentActiveTriggerId && triggerCount === 1) {
        const iteratorResult = store.context.triggerElements.entries().next();
        if (!iteratorResult.done) {
          const [implicitTriggerId, implicitTriggerElement] = iteratorResult.value;
          stateUpdates.activeTriggerId = implicitTriggerId;
          stateUpdates.activeTriggerElement = implicitTriggerElement;
          resolvedActiveTriggerIdRef.current = implicitTriggerId;
        }
      }

      if (
        stateUpdates.triggerCount !== undefined ||
        stateUpdates.activeTriggerId !== undefined ||
        stateUpdates.activeTriggerElement !== undefined
      ) {
        store.update(stateUpdates);
      }

      if (lostActiveTriggerId) {
        if (closeOnActiveTriggerUnmount) {
          // Defer so a same-tick replacement trigger with the same id can register first.
          queueMicrotask(() => {
            if (
              store.select('open') &&
              store.select('activeTriggerId') === lostActiveTriggerId &&
              !store.context.triggerElements.getById(lostActiveTriggerId)
            ) {
              const eventDetails = createChangeEventDetails(REASONS.none);
              store.setOpen(false, eventDetails);
              // If closing is canceled, keep the previous active trigger ownership for the
              // still-open popup instead of claiming another trigger implicitly.
              if (!eventDetails.isCanceled) {
                store.update({
                  activeTriggerId: null,
                  activeTriggerElement: null,
                } as any);
              }
            }
          });
        }
      }
    },
    {flush: 'post', immediate: true},
  );
}

type ReactStoreType<State extends PopupStoreState<unknown>> = ReactStore<
  State,
  PopupStoreContext<never>,
  typeof popupStoreSelectors
>;

type PopupInteractionPropKey = 'activeTriggerProps' | 'inactiveTriggerProps' | 'popupProps';

export function usePopupInteractionProps<
  State extends PopupStoreState<unknown>,
  const Key extends keyof State,
>(
  store: ReactStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  statePart: Pick<State, Key | PopupInteractionPropKey>,
) {
  store.useSyncedValues(statePart);

  onUnmounted(() => {
    store.update({
      activeTriggerProps: EMPTY_OBJECT,
      inactiveTriggerProps: EMPTY_OBJECT,
      popupProps: EMPTY_OBJECT,
    } as any);
  });
}

export function usePopupRootSync<
  State extends PopupStoreState<unknown> & {
    openMethod: InteractionType | null;
  },
>(store: ReactStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>, open: boolean) {
  watch(
    () => open,
    () => {
      if (!open && store.state.openMethod !== null) {
        store.set('openMethod', null);
      }
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    if (store.state.openMethod !== null) {
      store.set('openMethod', null);
    }
  });
}

export { useRefWithInit } from '@/utils/useRefWithInit';

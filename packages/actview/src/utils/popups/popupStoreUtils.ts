import { computed, onUnmounted, watch } from 'actview';
import type { Ref } from '@actview/core';
import type { ActviewStore } from '@base-ui/actview-utils/store';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import { useId } from '@base-ui/actview-utils/useId';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import type { VNodeChild } from '@actview/jsx';
import { FOCUSABLE_ATTRIBUTE } from '@/floating-ui-actview/utils/constants';
import { useFloatingParentNodeId } from '@/floating-ui-actview/components/FloatingTree';
import {
  useSyncedFloatingRootContext,
  type SyncedFloatingRootContextStore,
} from '@/floating-ui-actview/hooks/useSyncedFloatingRootContext';
import { useTransitionStatus } from '@/internals/useTransitionStatus';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import type { HTMLProps, RefValue } from '@/internals/types';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import {
  PopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupTriggerDataStore,
} from '@/utils/popups/store';

export const FOCUSABLE_POPUP_PROPS = {
  tabIndex: -1,
  [FOCUSABLE_ATTRIBUTE]: '',
} satisfies HTMLProps<HTMLElement> & Record<typeof FOCUSABLE_ATTRIBUTE, string>;

/**
 * Returns the default `initialFocus` resolver for a popup. When opened by touch it focuses the
 * popup element itself to prevent the virtual keyboard from opening (required for Android
 * specifically; iOS handles this automatically). Otherwise it falls back to the default behavior.
 */
export function createDefaultInitialFocus(popupRef: RefValue<HTMLElement | null>) {
  return (interactionType: InteractionType) =>
    interactionType === 'touch' ? resolveRefValue(popupRef) : true;
}

function resolveRefValue<T>(ref: RefValue<T>): T | null {
  if (ref == null) {
    return null;
  }
  if (typeof ref === 'function') {
    return null;
  }
  return (ref.current ?? ref.value ?? null) as T | null;
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
 *
 * @param createStore Factory that builds the store. Called exactly once, receiving the floating id
 * and whether the popup is nested inside another floating element, both resolved on the first render.
 * @param treatPopupAsFloatingElement Whether the popup element is passed to Floating UI as the
 * floating element instead of the default positioner.
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
 * Attaches a Root's store to a handle for this component's lifetime.
 */
export function PopupHandleAttachment<Store>({
  handle,
  store,
}: {
  handle: PopupRootStoreHandle<Store>;
  store: Store;
}) {
  watch(
    [() => handle, () => store],
    (_value, _oldValue, onCleanup) => {
      const detach = handle.attachStore(store);
      onCleanup(detach);
    },
    { immediate: true },
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
 *
 * Stable so a downstream ref merger that retains the callback it was first given still reaches the
 * trigger's current store. The registration is tracked as a `(store, id, element)` triple, so
 * unregistering targets the store the element was actually registered in.
 *
 * @param id Id of the trigger.
 * @param store The Store instance where the trigger should be registered.
 */
export function useTriggerRegistration<State extends PopupStoreState<unknown>>(
  id: string | undefined,
  store: PopupTriggerDataStore<State>,
) {
  let registration: {
    store: PopupTriggerDataStore<State>;
    id: string;
    element: Element;
  } | null = null;

  return (element: Element | null) => {
    const previous = registration;

    if (previous !== null) {
      if (previous.element === element && previous.store === store && previous.id === id) {
        // Already registered where it belongs.
        return;
      }

      registration = null;
      if (previous.store.context.triggerElements.getById(previous.id) === previous.element) {
        previous.store.context.triggerElements.delete(previous.id);
        syncTriggerCount(previous.store);
      }
    }

    if (element !== null && id !== undefined) {
      registration = { store, id, element };
      store.context.triggerElements.add(id, element);
      syncTriggerCount(store);
    }
  };
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

export function attachPreventUnmountOnClose(eventDetails: { preventUnmountOnClose(): void }) {
  let preventUnmountOnClose = false;

  eventDetails.preventUnmountOnClose = () => {
    preventUnmountOnClose = true;
  };

  return () => preventUnmountOnClose;
}

/**
 * Runs the shared open-change sequence for a popup store: notifies `onOpenChange`,
 * honors cancellation, dispatches the floating root change, maps the reason to an
 * `instantType`, and commits the state update.
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
  eventDetails: EventDetails & { preventUnmountOnClose(): void },
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

    const updatedState = { ...options.extraState, ...popupOpenState } as Pick<
      State,
      keyof PopupOpenState | ExtraKey | 'instantType'
    >;

    if (isFocusOpen) {
      updatedState.instantType = 'focus';
    } else if (isDismissClose) {
      updatedState.instantType = 'dismiss';
    } else if (isHover) {
      updatedState.instantType = undefined;
    }

    store.update(updatedState);
  };

  // ActView state updates are synchronous; hover needs no extra flush to be visible to
  // `node.getAnimations()`.
  changeState();
}

/**
 * Sets up trigger data forwarding to the store.
 *
 * @param triggerId Id of the trigger.
 * @param triggerElementRef Ref for the trigger DOM element.
 * @param store The Store instance managing the popup state.
 * @param stateUpdates An object with state updates to apply when the trigger is active.
 */
export function useTriggerDataForwarding<
  State extends PopupStoreState<unknown>,
  const Key extends keyof Omit<State, 'activeTriggerId' | 'activeTriggerElement'>,
>(
  triggerId: string | undefined,
  triggerElementRef: RefValue<Element | null>,
  store: PopupTriggerDataStore<State>,
  stateUpdates: Pick<State, Key>,
) {
  const isMountedByThisTrigger = store.useState('isMountedByTrigger', triggerId);

  const baseRegisterTrigger = useTriggerRegistration(triggerId, store);

  // Applies trigger-owned state (active-trigger ownership and payload) when the trigger registers.
  const applyTriggerData = (element: Element) => {
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
  };

  // Stable: the merged ref on the rendered element keeps its identity for the trigger's whole
  // lifetime.
  const registerTrigger = (element: Element | null) => {
    baseRegisterTrigger(element);
    if (element) {
      applyTriggerData(element);
    }
  };

  // A stable ref does not re-fire on a store or id change, so migrate here instead: unregister from
  // the previous store, then register the element the trigger still renders into the current one.
  watch(
    [() => store, () => triggerId],
    (_value, _oldValue, onCleanup) => {
      registerTrigger(resolveRefValue(triggerElementRef));
      onCleanup(() => registerTrigger(null));
    },
    { immediate: true },
  );

  watch(
    [isMountedByThisTrigger, () => store, () => triggerId],
    () => {
      if (isMountedByThisTrigger.value) {
        const changes = {
          activeTriggerElement: resolveRefValue(triggerElementRef),
          ...stateUpdates,
        } as Pick<Readonly<State>, Key | 'activeTriggerElement'>;
        store.update(changes);
      }
    },
    { immediate: true },
  );

  return { registerTrigger, isMountedByThisTrigger };
}

export type PayloadChildRenderFunction<Payload> = (arg: {
  payload: Payload | undefined;
}) => VNodeChild;

/**
 * Keeps trigger registration state synchronized while the popup is open.
 *
 * When a popup opens without an explicit trigger id and exactly one trigger is registered, that
 * trigger is claimed as the active trigger. When the active trigger id is still registered but its
 * element changed, the active element is refreshed. When the active trigger id is missing from the
 * registry but the same element is still registered under a different id (e.g. the rendered trigger
 * carries its own DOM `id` that differs from Base UI's internal trigger id), the active id is
 * reassociated to the registered id instead of being treated as lost. When the active trigger
 * unregisters, the default path preserves existing ownership so non-closing popup families do not
 * silently claim a different trigger while staying open.
 *
 * If `closeOnActiveTriggerUnmount` is enabled, unregistering a previously resolved active trigger
 * requests a close after a microtask so a same-tick replacement trigger with the same id can
 * register first. An active trigger id that has not matched a registered trigger yet is treated as
 * pending and does not request a close.
 *
 * This should be called on the Root part.
 *
 * @param store The Store instance managing the popup state.
 * @param options Options for active trigger unmount behavior.
 */
export function useImplicitActiveTrigger<State extends PopupStoreState<unknown>>(
  store: PopupStoreWithOpen<State, BaseUIChangeEventDetails<typeof REASONS.none>>,
  options: {
    closeOnActiveTriggerUnmount?: boolean | undefined;
  } = {},
) {
  const { closeOnActiveTriggerUnmount = false } = options;
  // Distinguishes a trigger that unmounted from a new active trigger that has not hydrated yet.
  let resolvedActiveTriggerId: string | null = null;
  const open = store.useState('open');
  const reactiveTriggerCount = store.useState('triggerCount');
  // Subscribe to the active trigger id so the reconciliation below reruns when ownership moves to
  // another trigger while the popup stays open (e.g. a focus/hover handoff between triggers).
  const activeTriggerId = store.useState('activeTriggerId');
  // Subscribe to the active trigger element so the reconciliation reruns when a pending active
  // trigger registers in a commit where the trigger count nets out unchanged (registration
  // forwards the element to the store when the registering trigger matches the active id).
  // Without this, the id would never be marked resolved and a later genuine unmount would be
  // misclassified as pending, disabling `closeOnActiveTriggerUnmount`.
  const reactiveActiveTriggerElement = store.useState('activeTriggerElement');

  watch(
    [open, reactiveTriggerCount, activeTriggerId, reactiveActiveTriggerElement],
    () => {
      if (!open.value) {
        resolvedActiveTriggerId = null;
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
        const activeTriggerElement = store.context.triggerElements.getById(
          currentActiveTriggerId,
        );
        if (!activeTriggerElement) {
          for (const [triggerId, triggerElement] of store.context.triggerElements.entries()) {
            if (triggerElement === store.state.activeTriggerElement) {
              stateUpdates.activeTriggerId = triggerId;
              stateUpdates.activeTriggerElement = triggerElement;
              resolvedActiveTriggerId = triggerId;
              break;
            }
          }

          if (stateUpdates.activeTriggerId === undefined) {
            if (resolvedActiveTriggerId === currentActiveTriggerId) {
              lostActiveTriggerId = currentActiveTriggerId;
            } else {
              resolvedActiveTriggerId = null;
            }
          }
        } else {
          resolvedActiveTriggerId = currentActiveTriggerId;
          if (activeTriggerElement !== store.state.activeTriggerElement) {
            stateUpdates.activeTriggerElement = activeTriggerElement;
          }
        }
      } else {
        resolvedActiveTriggerId = null;
      }

      if (!lostActiveTriggerId && !currentActiveTriggerId && triggerCount === 1) {
        const iteratorResult = store.context.triggerElements.entries().next();
        if (!iteratorResult.done) {
          const [implicitTriggerId, implicitTriggerElement] = iteratorResult.value;
          stateUpdates.activeTriggerId = implicitTriggerId;
          stateUpdates.activeTriggerElement = implicitTriggerElement;
          resolvedActiveTriggerId = implicitTriggerId;
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
                });
              }
            }
          });
        }
      }
    },
    { immediate: true },
  );
}

/**
 * Manages the mounted state of the popup.
 * Sets up the transition status listeners and handles unmounting when needed.
 * Updates the `mounted`, `transitionStatus`, and `preventUnmountingOnClose` states in the store.
 *
 * @param open Whether the popup is open.
 * @param store The Store instance managing the popup state.
 * @param onUnmount Optional callback to be called when the popup is unmounted.
 *
 * @returns A function to forcibly unmount the popup.
 */
export function useOpenStateTransitions<State extends PopupStoreState<unknown>>(
  open: Ref<boolean>,
  store: ActviewStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  onUnmount?: () => void,
) {
  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open);
  const preventUnmountingOnClose = store.useState('preventUnmountingOnClose');
  // Opening starts a new close cycle. Clear so the close-completion hook below reads the
  // synchronized value on the same pass.
  const syncedPreventUnmountingOnClose = computed(() =>
    open.value ? false : preventUnmountingOnClose.value,
  );

  store.useSyncedValues({
    mounted,
    transitionStatus,
    preventUnmountingOnClose: syncedPreventUnmountingOnClose,
  });

  const forceUnmount = () => {
    setMounted(false);
    store.update({
      activeTriggerId: null,
      activeTriggerElement: null,
      mounted: false,
      preventUnmountingOnClose: false,
    });
    onUnmount?.();
    store.context.onOpenChangeComplete?.(false);
  };

  useOpenChangeComplete({
    enabled: computed(
      () => mounted.value && !open.value && !syncedPreventUnmountingOnClose.value,
    ),
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (!open.value) {
        forceUnmount();
      }
    },
  });

  return { forceUnmount, transitionStatus };
}

type PopupInteractionPropKey = 'activeTriggerProps' | 'inactiveTriggerProps' | 'popupProps';

export function usePopupInteractionProps<
  State extends PopupStoreState<unknown>,
  const Key extends keyof State,
>(
  store: ActviewStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  statePart: Pick<State, Key | PopupInteractionPropKey>,
) {
  store.useSyncedValues(statePart);

  onUnmounted(() => {
    store.update({
      activeTriggerProps: EMPTY_OBJECT,
      inactiveTriggerProps: EMPTY_OBJECT,
      popupProps: EMPTY_OBJECT,
    });
  });
}

export function usePopupRootSync<
  State extends PopupStoreState<unknown> & {
    openMethod: InteractionType | null;
  },
>(
  store: ActviewStore<State, PopupStoreContext<never>, typeof popupStoreSelectors>,
  open: Ref<boolean>,
) {
  watch(
    open,
    (isOpen) => {
      if (!isOpen && store.state.openMethod !== null) {
        store.set('openMethod', null);
      }
    },
  );

  onUnmounted(() => {
    if (store.state.openMethod !== null) {
      store.set('openMethod', null);
    }
  });
}

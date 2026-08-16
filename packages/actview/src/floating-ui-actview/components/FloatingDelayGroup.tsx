import { computed, onUnmounted, ref, watch } from 'actview';
import type { Ref } from '@actview/core';
import type { VNodeChild } from '@actview/jsx';
import { useTimeout, Timeout } from '@base-ui/actview-utils/useTimeout';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { createContext } from '../../internals/createContext';

import { getDelay } from '../hooks/useHoverShared';
import type { FloatingRootContext, Delay, FloatingContext } from '../types';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

interface ContextValue {
  hasProvider: boolean;
  timeoutMs: number;
  delayRef: { current: Delay };
  initialDelayRef: { current: Delay };
  timeout: Timeout;
  currentIdRef: { current: string | null | undefined };
  currentContextRef: {
    current: {
      onOpenChange: (open: boolean, eventDetails: BaseUIChangeEventDetails<any>) => void;
      setIsInstantPhase: (value: boolean) => void;
    } | null;
  };
}

const defaultTimeout = new Timeout();

const FloatingDelayGroupContext = createContext<ContextValue>(
  'base-ui-floating-delay-group-context',
  {
    hasProvider: false,
    timeoutMs: 0,
    delayRef: { current: 0 },
    initialDelayRef: { current: 0 },
    timeout: defaultTimeout,
    currentIdRef: { current: null },
    currentContextRef: { current: null },
  },
);

function resetDelayRef(
  delayRef: { current: Delay },
  initialDelayRef: { current: Delay },
) {
  delayRef.current = initialDelayRef.current;
}

export interface FloatingDelayGroupProps {
  children?: VNodeChild;
  /**
   * The delay to use for the group when it's not in the instant phase.
   */
  delay: Delay;
  /**
   * An optional explicit timeout to use for the group, which represents when
   * grouping logic will no longer be active after the close delay completes.
   * This is useful if you want grouping to “last” longer than the close delay,
   * for example if there is no close delay at all.
   */
  timeoutMs?: number | undefined;
}

/**
 * Experimental next version of `FloatingDelayGroup` to become the default
 * in the future. This component is not yet stable.
 * Provides context for a group of floating elements that should share a
 * `delay`. Unlike `FloatingDelayGroup`, `useDelayGroup` with this
 * component does not cause a re-render of unrelated consumers of the
 * context when the delay changes.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function FloatingDelayGroup(props: FloatingDelayGroupProps) {
  const delayRef = { current: props.delay };
  const initialDelayRef = { current: props.delay };
  const currentIdRef = { current: null as string | null };
  const currentContextRef = {
    current: null as {
      onOpenChange: (open: boolean, eventDetails: BaseUIChangeEventDetails<any>) => void;
      setIsInstantPhase: (value: boolean) => void;
    } | null,
  };
  const timeout = useTimeout();

  watch(
    () => props.delay,
    (delay) => {
      initialDelayRef.current = delay;

      if (!currentIdRef.current) {
        delayRef.current = delay;
        return;
      }

      delayRef.current = {
        open: getDelay(delayRef.current, 'open'),
        close: getDelay(delay, 'close'),
      };
    },
    { immediate: true },
  );

  const contextValue = computed<ContextValue>(() => ({
    hasProvider: true,
    delayRef,
    initialDelayRef,
    currentIdRef,
    timeoutMs: props.timeoutMs ?? 0,
    currentContextRef,
    timeout,
  }));

  return (
    <FloatingDelayGroupContext.Provider value={contextValue}>
      {props.children}
    </FloatingDelayGroupContext.Provider>
  );
}

interface UseDelayGroupOptions {
  /**
   * Whether the trigger this hook is used in has opened the tooltip.
   */
  open: boolean;
}

interface UseDelayGroupReturn {
  /**
   * The id of the floating element keeping the delay group active.
   */
  activeIdRef: { current: string | null | undefined };
  /**
   * The delay reference object.
   */
  delayRef: { current: Delay };
  /**
   * Whether animations should be removed.
   */
  isInstantPhase: Ref<boolean>;
  /**
   * Whether a `<FloatingDelayGroup>` provider is present.
   */
  hasProvider: boolean;
}

/**
 * Enables grouping when called inside a component that's a child of a
 * `FloatingDelayGroup`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function useDelayGroup(
  context: FloatingRootContext | FloatingContext,
  options: UseDelayGroupOptions = { open: false },
): UseDelayGroupReturn {
  const store = 'rootStore' in context ? context.rootStore : context;
  const floatingId = store.useState('floatingId');

  const groupContext = FloatingDelayGroupContext.use().value;
  const {
    currentIdRef,
    delayRef,
    timeoutMs,
    initialDelayRef,
    currentContextRef,
    hasProvider,
    timeout,
  } = groupContext;

  const isInstantPhase = ref(false);
  const setIsInstantPhase = (value: boolean) => {
    isInstantPhase.value = value;
  };
  const openRef = useValueAsRef(options.open);

  watch(
    [() => openRef.current, floatingId],
    ([open, floatingIdValue], _old, onCleanup) => {
      function unset() {
        currentContextRef.current?.setIsInstantPhase(false);
        currentIdRef.current = null;
        currentContextRef.current = null;
        delayRef.current = initialDelayRef.current;
        timeout.clear();
      }

      if (!currentIdRef.current) {
        return;
      }

      if (!open && currentIdRef.current === floatingIdValue) {
        setIsInstantPhase(false);

        if (timeoutMs) {
          const closingId = floatingIdValue;
          timeout.start(timeoutMs, () => {
            // If another tooltip has taken over the group, skip resetting.
            if (
              store.select('open') ||
              (currentIdRef.current && currentIdRef.current !== closingId)
            ) {
              return;
            }
            unset();
          });
          onCleanup(() => {
            if (openRef.current || currentIdRef.current !== closingId) {
              timeout.clear();
            }
          });
        } else {
          unset();
        }
      }
    },
  );

  watch(
    () => openRef.current,
    (open) => {
      if (!open) {
        return;
      }

      const prevContext = currentContextRef.current;
      const prevId = currentIdRef.current;

      // A new tooltip is opening, so cancel any pending timeout that would reset
      // the group's delay back to the initial value.
      timeout.clear();
      currentContextRef.current = { onOpenChange: store.setOpen, setIsInstantPhase };
      currentIdRef.current = floatingId.value;
      delayRef.current = {
        open: 0,
        close: getDelay(initialDelayRef.current, 'close'),
      };

      if (prevId !== null && prevId !== floatingId.value) {
        setIsInstantPhase(true);
        prevContext?.setIsInstantPhase(true);
        prevContext?.onOpenChange(false, createChangeEventDetails(REASONS.none));
      } else {
        setIsInstantPhase(false);
        prevContext?.setIsInstantPhase(false);
      }
    },
  );

  onUnmounted(() => {
    if (currentIdRef.current === floatingId.value) {
      currentContextRef.current = null;

      if (!openRef.current) {
        return;
      }

      currentIdRef.current = null;
      resetDelayRef(delayRef, initialDelayRef);
      timeout.clear();
    }
  });

  return {
    activeIdRef: currentIdRef,
    hasProvider,
    delayRef,
    isInstantPhase,
  };
}

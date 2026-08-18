import { ref, unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { AnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';

export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;

type MaybeRef<T> = T | Ref<T>;

/**
 * Provides a status string for CSS animations.
 * @param open - a boolean (or ref) that determines if the element is open.
 * @param enableIdleState - a boolean that enables the `'idle'` state between `'starting'` and `'ending'`
 */
export function useTransitionStatus(
  open: MaybeRef<boolean>,
  enableIdleState: boolean = false,
  deferEndingState: boolean = false,
) {
  const initialOpen = unref(open);
  const transitionStatus = ref<TransitionStatus>(
    initialOpen && enableIdleState ? 'idle' : undefined,
  );
  const mounted = ref(initialOpen);

  // Render-phase state transitions (React version runs these on every render).
  watch(
    [() => unref(open), mounted, transitionStatus],
    (newVals) => {
      const [isOpen, isMounted, status] = Array.isArray(newVals) ? newVals : [];
      if (isOpen && !isMounted) {
        mounted.value = true;
        transitionStatus.value = 'starting';
      }

      if (!isOpen && isMounted && status !== 'ending' && !deferEndingState) {
        transitionStatus.value = 'ending';
      }

      if (!isOpen && !isMounted && status === 'ending') {
        transitionStatus.value = undefined;
      }
    },
    { immediate: true },
  );

  // deferEndingState layout effect
  watch(
    [() => unref(open), mounted, transitionStatus],
    (newVals, _old, onCleanup) => {
      const [isOpen, isMounted, status] = Array.isArray(newVals) ? newVals : [];
      if (!isOpen && isMounted && status !== 'ending' && deferEndingState) {
        const frame = AnimationFrame.request(() => {
          transitionStatus.value = 'ending';
        });

        onCleanup(() => {
          AnimationFrame.cancel(frame);
        });
      }
    },
  );

  // Clear 'starting' after a frame when the idle state is disabled.
  watch(
    [() => unref(open)],
    ([isOpen], _old, onCleanup) => {
      if (!isOpen || enableIdleState) {
        return;
      }

      const frame = AnimationFrame.request(() => {
        // Avoid `flushSync` here due to Firefox.
        // See https://github.com/mui/base-ui/pull/3424
        transitionStatus.value = undefined;
      });

      onCleanup(() => {
        AnimationFrame.cancel(frame);
      });
    },
  );

  // Idle-state sequence.
  watch(
    [() => unref(open), mounted, transitionStatus],
    (newVals, _old, onCleanup) => {
      const [isOpen, isMounted, status] = Array.isArray(newVals) ? newVals : [];
      if (!isOpen || !enableIdleState) {
        return;
      }

      if (isOpen && isMounted && status !== 'idle') {
        transitionStatus.value = 'starting';
      }

      const frame = AnimationFrame.request(() => {
        transitionStatus.value = 'idle';
      });

      onCleanup(() => {
        AnimationFrame.cancel(frame);
      });
    },
  );

  return {
    mounted,
    setMounted: (value: boolean) => {
      mounted.value = value;
    },
    transitionStatus,
  };
}

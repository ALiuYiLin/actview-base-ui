import { unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { useAnimationsFinished } from './useAnimationsFinished';

type MaybeRef<T> = T | Ref<T>;

/**
 * Calls the provided function when the CSS open/close animation or transition completes.
 */
export function useOpenChangeComplete(parameters: UseOpenChangeCompleteParameters) {
  const { enabled = true, open, ref, onComplete } = parameters;

  const runOnceAnimationsFinish = useAnimationsFinished(ref, open);

  watch(
    [() => unref(enabled), () => unref(open)],
    (newVals, _old, onCleanup) => {
      // Guard against a stale post-unmount callback receiving `undefined` (AD-33).
      const [isEnabled] = Array.isArray(newVals) ? newVals : [];
      if (!isEnabled) {
        return;
      }

      const abortController = new AbortController();
      runOnceAnimationsFinish(onComplete, abortController.signal);

      onCleanup(() => {
        abortController.abort();
      });
    },
    { immediate: true },
  );
}

export interface UseOpenChangeCompleteParameters {
  /**
   * Whether the hook is enabled.
   * @default true
   */
  enabled?: MaybeRef<boolean> | undefined;
  /**
   * Whether the element is open.
   */
  open?: MaybeRef<boolean> | undefined;
  /**
   * Ref to the element being closed.
   */
  ref: { current?: HTMLElement | null; value?: HTMLElement | null } | HTMLElement | null;
  /**
   * Function to call when the animation completes (or there is no animation).
   */
  onComplete: () => void;
}

export interface UseOpenChangeCompleteState {}

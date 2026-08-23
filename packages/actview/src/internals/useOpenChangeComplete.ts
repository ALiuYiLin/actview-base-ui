import { ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';
import type { MaybeRefOrGetter } from '@/internals/types';
import { useAnimationsFinished } from './useAnimationsFinished';

/**
 * Calls the provided function when the CSS open/close animation or transition completes.
 * (actview 转译版：useStableCallback + useEffect → watch + 稳定闭包；
 * ref 参数为 actview Ref（.value 读元素）。)
 */
export function useOpenChangeComplete(parameters: UseOpenChangeCompleteParameters) {
  const {enabled = true, open, ref: elementRef, onComplete: onCompleteParam} = parameters;

  const runOnceAnimationsFinish = useAnimationsFinished(elementRef, toValue(open));

  watch(
    () => [toValue(enabled), toValue(open)],
    ([enabledValue], _old, onCleanup) => {
      if (!enabledValue) {
        return;
      }

      const abortController = new AbortController();

      runOnceAnimationsFinish(
        () => onCompleteParam(),
        abortController.signal,
      );

      onCleanup(() => {
        abortController.abort();
      });
    },
    {immediate: true},
  );
}

export interface UseOpenChangeCompleteParameters {
  /**
   * Whether the hook is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean> | undefined;
  /**
   * Whether the element is open.
   */
  open?: MaybeRefOrGetter<boolean> | undefined;
  /**
   * Ref to the element being closed.
   */
  ref: Ref<HTMLElement | null> | {value: HTMLElement | null} | {current: HTMLElement | null};
  /**
   * Function to call when the animation completes (or there is no animation).
   */
  onComplete: () => void;
}

export interface UseOpenChangeCompleteState {}

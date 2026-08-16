import { ref, unref, watch, type Ref } from '@actview/core';

type MaybeRef<T> = T | Ref<T>;

/**
 * Returns a ref holding the previous value of its argument.
 * @param value Current value (a ref, or a plain value).
 * @returns A ref whose `.value` is the previous value, or `null` if there is no previous value.
 */
export function usePreviousValue<T>(value: MaybeRef<T>): Ref<T | null> {
  const previous = ref<T | null>(null);

  watch(
    () => unref(value),
    (_newValue, oldValue) => {
      previous.value = oldValue;
    },
  );

  return previous;
}

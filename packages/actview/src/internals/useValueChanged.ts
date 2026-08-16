import { unref, watch } from 'actview';
import type { Ref } from '@actview/core';

type MaybeRef<T> = T | Ref<T>;

/**
 * Calls `onChange` with the previous value whenever `value` changes.
 *
 * Unlike the React version (which compares against a ref in a layout effect), this is
 * implemented with a `watch` on the unwrapped value, so `value` may be a plain value or a ref.
 */
export function useValueChanged<T>(value: MaybeRef<T>, onChange: (previousValue: T) => void) {
  watch(
    () => unref(value),
    (_newValue, oldValue) => {
      onChange(oldValue);
    },
  );
}

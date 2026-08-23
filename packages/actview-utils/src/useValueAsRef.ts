import { unref, type Ref } from '@actview/core';

type MaybeRef<T> = T | Ref<T>;

/**
 * Untracks the provided value by exposing it through a plain object with a live `current`
 * property. Used to access the passed value inside effects and event handlers without
 * subscribing to it as a dependency.
 *
 * The `next`/`effect` fields are kept for API compatibility with the React version; they
 * are inert in ActView.
 */
export function useValueAsRef<T>(value: MaybeRef<T>) {
  const latest = {
    get current(): T {
      return unref(value);
    },
    next: undefined as T | undefined,
    effect() {},
  };
  return latest;
}

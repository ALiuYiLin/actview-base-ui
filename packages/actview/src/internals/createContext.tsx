import { computed, provide, unref, useInjects } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';

/**
 * A context value source: a plain value, a getter, or a ref/computed.
 * The provider wraps it in a `computed`, so consumers always get a live source.
 */
export type ContextSource<T> = T | (() => T) | Ref<T> | ComputedRef<T>;

/**
 * Creates an ActView context: a provider component (calls `provide` in its setup)
 * and a `use` function returning a `ComputedRef` of the current value.
 *
 * ActView context values are provided once per setup, so the provider wraps the
 * value in a `computed` — consumers must read `.value` inside their render
 * functions (or getters called from JSX) to stay reactive.
 *
 * Note: ActView's injection table cannot distinguish "no provider" from a provider
 * passing `undefined`; both fall back to the default value.
 */
export function createContext<T>(key: string, defaultValue: T) {
  function Provider(props: { value: ContextSource<T>; children?: any }) {
    const live = computed(() => unref(props.value));
    provide(key, live);
    return <>{props.children}</>;
  }

  function use(): ComputedRef<T> {
    const provided = useInjects(key);
    if (provided === undefined) {
      return computed(() => defaultValue);
    }
    return provided as ComputedRef<T>;
  }

  return { key, Provider, use };
}

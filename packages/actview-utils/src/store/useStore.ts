import { onUnmounted, shallowRef, unref, type Ref } from '@actview/core';
import type { ReadonlyStore } from './Store';

/**
 * Subscribes to a store and returns a shallow ref that tracks the selected value.
 *
 * This is the ActView equivalent of `useSyncExternalStore`: the subscription callback
 * re-evaluates the selector on every store notification and only updates the ref when
 * the selected value changes (compared with `Object.is`), mirroring React's behavior
 * of skipping re-renders for unchanged snapshots.
 *
 * Selector arguments (`a1`…`a3`) may be refs; they are unwrapped at selection time.
 */
export function useStore<State, Value>(
  store: ReadonlyStore<State>,
  selector: (state: State) => Value,
): Ref<Value>;
export function useStore<State, Value, A1>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1) => Value,
  a1: A1,
): Ref<Value>;
export function useStore<State, Value, A1, A2>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1, a2: A2) => Value,
  a1: A1,
  a2: A2,
): Ref<Value>;
export function useStore<State, Value, A1, A2, A3>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1, a2: A2, a3: A3) => Value,
  a1: A1,
  a2: A2,
  a3: A3,
): Ref<Value>;
export function useStore(
  store: ReadonlyStore<unknown>,
  selector: Function,
  a1?: unknown,
  a2?: unknown,
  a3?: unknown,
): Ref<unknown> {
  const select = () => selector(store.getSnapshot(), unref(a1), unref(a2), unref(a3));

  const value = shallowRef(select());

  const unsubscribe = store.subscribe((nextState) => {
    const nextValue = selector(nextState, unref(a1), unref(a2), unref(a3));
    if (!Object.is(value.value, nextValue)) {
      value.value = nextValue;
    }
  });

  onUnmounted(unsubscribe);

  return value;
}

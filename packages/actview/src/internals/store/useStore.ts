import { computed, onUnmounted, ref, watch } from 'actview';
import type { ComputedRef } from 'actview';
import type { ReadonlyStore } from './Store';

/**
 * Subscribes to a store and returns a computed value derived from the selected state.
 *
 * (actview 版：React 的 useSyncExternalStore → 订阅 store + computed。
 * store 状态变化时通过 tick ref 触发 computed 重算。)
 */
export function useStore<State, Value>(
  store: ReadonlyStore<State>,
  selector: (state: State) => Value,
): ComputedRef<Value>;
export function useStore<State, Value, A1>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1) => Value,
  a1: A1,
): ComputedRef<Value>;
export function useStore<State, Value, A1, A2>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1, a2: A2) => Value,
  a1: A1,
  a2: A2,
): ComputedRef<Value>;
export function useStore<State, Value, A1, A2, A3>(
  store: ReadonlyStore<State>,
  selector: (state: State, a1: A1, a2: A2, a3: A3) => Value,
  a1: A1,
  a2: A2,
  a3: A3,
): ComputedRef<Value>;
export function useStore(
  store: ReadonlyStore<unknown>,
  selector: Function,
  a1?: unknown,
  a2?: unknown,
  a3?: unknown,
): ComputedRef<unknown> {
  const tick = ref(0);

  const unsubscribe = store.subscribe(() => {
    tick.value += 1;
  });
  onUnmounted(unsubscribe);

  return computed(() => {
    void tick.value;
    return selector(store.getSnapshot(), a1, a2, a3);
  });
}

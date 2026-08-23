import { toValue, watch } from 'actview';
import type { Ref } from 'actview';

type MaybeRefLike<T> = T | Ref<T> | (() => T);

/**
 * Untracks the provided value by turning it into a ref to remove its reactivity.
 *
 * (actview 版：sync watch 同步最新值；用于事件处理器中读取最新渲染值。)
 */
export function useValueAsRef<T>(value: MaybeRefLike<T>): {current: T} {
  const latest = {current: toValue(value)};

  watch(
    () => toValue(value),
    (v) => {
      latest.current = v;
    },
    {flush: 'sync'},
  );

  return latest;
}

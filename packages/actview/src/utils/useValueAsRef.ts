import { ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';

type MaybeRefLike<T> = T | Ref<T> | (() => T);

/**
 * Untracks the provided value by turning it into a ref to remove its reactivity.
 *
 * (actview 版：sync watch 同步最新值；用于事件处理器中读取最新渲染值。
 * 返回 actview Ref——读写走 `.value`。)
 */
export function useValueAsRef<T>(value: MaybeRefLike<T>): Ref<T> {
  const latest = ref<T>(toValue(value));

  watch(
    () => toValue(value),
    (v) => {
      latest.value = v;
    },
    {flush: 'sync'},
  );

  return latest;
}

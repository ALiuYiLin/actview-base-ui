import { toValue, watch } from 'actview';
import type { MaybeRefOrGetter } from '@/types';

export function useValueChanged<T>(
  value: MaybeRefOrGetter<T>,
  onChange: (previousValue: T) => void,
) {
  const valueRef = {current: toValue(value)};

  // React 版 useIsoLayoutEffect：值变化时用旧值回调（首次执行相等不触发）
  watch(
    () => toValue(value),
    () => {
      const nextValue = toValue(value);
      if (valueRef.current !== nextValue) {
        onChange(valueRef.current);
      }
      valueRef.current = nextValue;
    },
    {flush: 'post', immediate: true},
  );
}

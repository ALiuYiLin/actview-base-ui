import {toValue, watch, ref} from 'actview';
import type { MaybeRefOrGetter } from '@/types';

export function useValueChanged<T>(
  value: MaybeRefOrGetter<T>,
  onChange: (previousValue: T) => void,
) {
  const valueRef = ref(toValue(value));

  // React 版 useIsoLayoutEffect：值变化时用旧值回调（首次执行相等不触发）
  watch(
    () => toValue(value),
    () => {
      const nextValue = toValue(value);
      if (valueRef.value !== nextValue) {
        onChange(valueRef.value);
      }
      valueRef.value = nextValue;
    },
    {flush: 'post', immediate: true},
  );
}

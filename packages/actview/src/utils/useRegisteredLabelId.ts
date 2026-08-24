import {computed, onUnmounted, toValue, watch, ref} from 'actview';
import type { ComputedRef } from 'actview';
import type { MaybeRefOrGetter } from '@/types';
import { useBaseUiId } from '@/internals/useBaseUiId';

export function useRegisteredLabelId(
  idProp: MaybeRefOrGetter<string | undefined>,
  setLabelId: (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void,
): ComputedRef<string | undefined> {
  const generatedId = useBaseUiId();
  const latestRegisteredId = ref(undefined as string | undefined);

  // setup 只跑一次：idProp 变化时 computed 重算（React 版每次 render 重算的等价物）
  const id = computed(() => toValue(idProp) ?? generatedId);

  watch(
    id,
    (idValue, _old, onCleanup) => {
      latestRegisteredId.value = idValue;
      setLabelId(idValue);
      onCleanup(() => {
        setLabelId((currentId) => (currentId === latestRegisteredId.value ? undefined : currentId));
      });
    },
    {flush: 'post', immediate: true},
  );

  // 组件卸载时 watch 的 onCleanup 不保证执行——显式注销（同 CollapsiblePanel/AccordionTrigger）
  onUnmounted(() => {
    setLabelId((currentId) => (currentId === latestRegisteredId.value ? undefined : currentId));
  });

  return id;
}



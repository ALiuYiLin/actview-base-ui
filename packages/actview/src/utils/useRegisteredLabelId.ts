import { computed, onUnmounted, unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { useBaseUiId } from '../internals/useBaseUiId';
import type { MaybeRef } from '../internals/types';

// Tracks the most recently registered label id per `setLabelId` writer, so an older label's
// cleanup does not clear a newer label's id. This mirrors the React functional update
// `setLabelId((currentId) => (currentId === id ? undefined : currentId))` without needing
// read access to the current value (ActView `setLabelId` is a plain writer).
const registeredLabelId = new WeakMap<Function, string | undefined>();

/**
 * 注册 label id 到 Root。idProp 必须是响应式的（computed/ref）——
 * setup 只跑一次，直接传原始 prop 会冻结首次值（PD-15），id 变化不会重新注册。
 */
export function useRegisteredLabelId(
  idProp: MaybeRef<string | undefined>,
  setLabelId: (id: string | undefined) => void,
): Ref<string | undefined> {
  // 兜底 id：setup 生成一次（稳定）。idProp 提供时优先（React 语义）
  const fallbackId = useBaseUiId();
  const id = computed(() => unref(idProp) ?? fallbackId);

  watch(
    id,
    (_nextId, _prevId, onCleanup) => {
      // 捕获当前 id：onCleanup 在下次触发时执行，闭包必须引用本次值
      const currentId = id.value;
      setLabelId(currentId);
      registeredLabelId.set(setLabelId, currentId);

      onCleanup(() => {
        if (registeredLabelId.get(setLabelId) === currentId) {
          registeredLabelId.set(setLabelId, undefined);
          setLabelId(undefined);
        }
      });
    },
    // flush: 'sync'：id 变化时同步重新注册
    { immediate: true, flush: 'sync' },
  );

  // ⚠️ 组件卸载时 watch 的 onCleanup 不执行（scope.stop 直接丢弃回调，案例 7）——
  // 必须显式 onUnmounted 清理，否则 Root 的 labelId 残留旧值（aria-labelledby 不清除）
  onUnmounted(() => {
    if (registeredLabelId.get(setLabelId) === id.value) {
      registeredLabelId.set(setLabelId, undefined);
      setLabelId(undefined);
    }
  });

  return id;
}

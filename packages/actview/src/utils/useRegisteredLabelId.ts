import { computed, onUnmounted, unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { useBaseUiId } from '../internals/useBaseUiId';
import type { MaybeRef } from '../internals/types';

// Tracks the most recently registered label id per `setLabelId` writer, so an older label's
// cleanup does not clear a newer label's id. This mirrors the React functional update
// `setLabelId((currentId) => (currentId === id ? undefined : currentId))` without needing
// read access to the current value (ActView `setLabelId` is a plain writer).
const registeredLabelId = new WeakMap<Function, string | undefined>();

type LabelIdSetter = (id: string | undefined) => void;
type LabelIdUpdater =
  | string
  | undefined
  | ((current: string | undefined) => string | undefined);

/**
 * 注册 label id 到 Root。idProp 必须是响应式的（computed/ref）——
 * setup 只跑一次，直接传原始 prop 会冻结首次值（PD-15），id 变化不会重新注册。
 */
export function useRegisteredLabelId(
  idProp: MaybeRef<string | undefined>,
  setLabelId: (id: LabelIdUpdater) => void,
): Ref<string | undefined> {
  // 兜底 id：setup 生成一次（稳定）。idProp 提供时优先（React 语义）
  const fallbackId = useBaseUiId();
  const id = computed(() => unref(idProp) ?? fallbackId);

  const stopW = watch(
    id,
    (_nextId, _prevId, onCleanup) => {
      // 捕获当前 id：onCleanup 在下次触发时执行，闭包必须引用本次值
      const currentId = id.value;
      setLabelId(currentId);
      registeredLabelId.set(setLabelId, currentId);

      onCleanup(() => {
        if (registeredLabelId.get(setLabelId) === currentId) {
          registeredLabelId.set(setLabelId, undefined);
          // 函数式注销：只有当前 labelId 仍是本实例注册的值才清（对齐 React
          // setLabelId((current) => (current === id ? undefined : current))）。
          // keyed remount（旧 key 卸载晚于新 key 挂载）时，当前 labelId 已是
          // 新实例注册的值——普通 setLabelId(undefined) 会误清新注册
          setLabelId((current: string | undefined) =>
            current === currentId ? undefined : current,
          );
        }
      });
    },
    // flush: 'sync'：id 变化时同步重新注册
    { immediate: true, flush: 'sync' },
  );

  // ⚠️ 组件卸载时 watch 的 onCleanup 不执行（scope.stop 只调 effect.stop()，不清 watch
  // 闭包的 cleanup，案例 7）——保存 watch 的 stop，卸载时调用即触发 onCleanup：
  // 复用同一份清理代码（"重跑前注销旧值"与"卸载注销"零重复）。
  onUnmounted(stopW);

  return id;
}

import { computed, nextTick, onMounted, onUpdated, ref, unref } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { MaybeRef } from '@/internals/types';

export function useAriaLabelledBy(
  explicitAriaLabelledBy: MaybeRef<string | undefined>,
  labelId: MaybeRef<string | undefined>,
  // 标准 ref()（value 形态，案例 6）：模板 ref / mergeRefsN 赋值 .value。
  // 旧 { current } 调用方（CheckboxRoot/SwitchRoot 等未重构家族）是错的，待各自重构统一
  labelSourceRef: Ref<LabelSource | null>,
  enableFallback: MaybeRef<boolean> = true,
  labelSourceId?: MaybeRef<string | undefined>,
): ComputedRef<string | undefined> {
  const fallbackAriaLabelledBy = ref<string | undefined>(undefined);

  // 无 labelSourceId 时：生成一次稳定 id（setup 只调一次 useId，React useId 语义）。
  // 有 labelSourceId 时：派生并**跟随当前值**（React 渲染期重算语义）——若在
  // setup 期快照（如 'radio-input-a'），input id 变化后解析 label 关联仍用旧 id，
  // 新 label 会拿到与旧 label 相同的 id（labelA.id === labelB.id）
  const fallbackGeneratedLabelId = useBaseUiId();
  const generatedLabelId = computed<string>(() => {
    const sourceId = unref(labelSourceId);
    return sourceId ? `${sourceId}-label` : fallbackGeneratedLabelId;
  });

  // Fallback for <span> controls labelled by wrapping/sibling native <label>.
  // ⚠️ actview-utils 的 useIsoLayoutEffect 只在挂载跑一次（无 onUpdated），DOM 关联
  // （label mount/unmount、control id 注册）变化时解析不到 → 改用 onMounted + onUpdated
  // 每次 commit 后重算（对齐 React 版 useIsoLayoutEffect 无 deps 语义）
  const updateFallbackAriaLabelledBy = () => {
    const explicit = unref(explicitAriaLabelledBy);
    const labelIdValue = unref(labelId);
    const fallbackEnabled = !unref(enableFallback);
    const nextAriaLabelledBy =
      explicit || labelIdValue || fallbackEnabled
        ? undefined
        : getAriaLabelledBy(labelSourceRef.value, generatedLabelId.value);

    if (fallbackAriaLabelledBy.value !== nextAriaLabelledBy) {
      fallbackAriaLabelledBy.value = nextAriaLabelledBy;
    }
  };

  onMounted(updateFallbackAriaLabelledBy);
  onUpdated(() => {
    // ⚠️ 延迟到子树 flush 完再解析：input 在子组件 Provider 的子树里，
    // patch(Provider) 是 queueJob（微任务），同步解析会读到旧 DOM
    // （input.id 未更新）→ findAssociatedLabel 按旧 id 找错 label
    // （labelB.id 永不生成）。nextTick 等本轮 flush 全部排空（对齐 Vue 3
    // onUpdated 只保证自身子树 patch 完，不保证子组件已更新的语义）
    void nextTick(updateFallbackAriaLabelledBy);
  });

  return computed(
    () => unref(explicitAriaLabelledBy) ?? unref(labelId) ?? fallbackAriaLabelledBy.value,
  );
}

function getAriaLabelledBy(labelSource?: LabelSource | null, generatedLabelId?: string) {
  const label = findAssociatedLabel(labelSource);
  if (!label) {
    return undefined;
  }

  if (!label.id && generatedLabelId) {
    label.id = generatedLabelId;
  }

  return label.id || undefined;
}

function findAssociatedLabel(labelSource?: LabelSource | null) {
  if (!labelSource) {
    return undefined;
  }

  // Fast path before the expensive `.labels` read.
  const parent = labelSource.parentElement;
  if (parent && parent.tagName === 'LABEL') {
    return parent as HTMLLabelElement;
  }

  const controlId = labelSource.id;
  if (controlId) {
    const nextSibling = labelSource.nextElementSibling as HTMLLabelElement | null;
    if (nextSibling && nextSibling.htmlFor === controlId) {
      return nextSibling;
    }
  }

  const labels = labelSource.labels;
  return labels && labels[0];
}

type LabelSource = HTMLElement & { labels?: NodeListOf<HTMLLabelElement> | null | undefined };

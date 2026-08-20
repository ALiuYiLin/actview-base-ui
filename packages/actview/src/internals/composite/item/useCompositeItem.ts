import { computed, useRootElement, watch } from 'actview';
import type { Ref } from '@actview/core';
import { useCompositeRootContext } from '../root/CompositeRootContext';
import {
  useCompositeListItem,
  type UseCompositeListItemParameters,
} from '../list/useCompositeListItem';
import type { HTMLProps } from '../../types';

export interface UseCompositeItemParameters<Metadata> extends Pick<
  UseCompositeListItemParameters<Metadata>,
  'metadata'
> {}

export function useCompositeItem<Metadata>(params: UseCompositeItemParameters<Metadata> = {}) {
  const context = useCompositeRootContext();
  const { ref, index } = useCompositeListItem(params);

  const isHighlighted = computed(() => context.value.highlightedIndex === index.value);

  // 组件根 DOM（subTree.el 统一解：根是元素/组件都拿到 DOM）。
  // 替代模板 ref + useMergedRefs 手动合并——ref 由框架自动绑定到根。
  const rootRef = useRootElement();

  // 注册到 CompositeList：根 DOM 挂载/更新/卸载时同步注册/注销。
  // flush 'sync'：卸载时序是 beforeUnmount（useRootElement 置 null）→ scope.stop()
  // → 微任务才跑；默认 flush（微任务）的 runJob 在 effect 停止后执行 → 回调被丢弃，
  // 注销永不触发。'sync' 在置 null 的瞬间同步执行，scope.stop() 之前完成注销 ✓
  watch(
    rootRef,
    (node) => {
      ref(node as HTMLElement | null);
    },
    { immediate: true, flush: 'sync' },
  );

  const onFocus = () => {
    context.value.onHighlightedIndexChange(index.value);
  };

  const onMouseMove = () => {
    const item = rootRef.value;
    if (!context.value.highlightItemOnHover || !item) {
      return;
    }

    const disabled = item.hasAttribute('disabled') || item.ariaDisabled === 'true';
    if (!isHighlighted.value && !disabled) {
      item.focus();
    }
  };

  // Getter evaluated on every render so `tabIndex` stays reactive.
  const compositeProps = (): HTMLProps => ({
    tabIndex: isHighlighted.value ? 0 : -1,
    onFocus,
    onMouseMove,
  });

  return {
    compositeProps,
    compositeRef: rootRef as Ref<HTMLElement | null>,
    index,
  };
}

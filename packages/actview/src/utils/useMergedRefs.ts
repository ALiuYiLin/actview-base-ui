import type { Ref } from 'actview';

type Empty = null | undefined;
type InputRef<I> =
  | ((instance: I | null) => void | (() => void))
  | Ref<I | null>
  | {value: I | null}
  | Empty;

/**
 * Merges refs into a single memoized callback ref or `null`.
 * (actview 转译版：setup 只执行一次，返回合并回调 ref；refs 组合在每次
 * 调用时读取——actview 组件 refs 通常固定（内部 ref），变化由组件自身
 * 处理。对象 ref 写入 `.value`（actview Ref 语义）。)
 */
export function useMergedRefs<I>(...refs: InputRef<I>[]): ((instance: I | null) => void) | null {
  if (refs.every((ref) => ref == null)) {
    return null;
  }

  return (instance: I | null) => {
    for (const ref of refs) {
      if (ref == null) {
        continue;
      }
      if (typeof ref === 'function') {
        const cleanup = ref(instance as any);
        if (instance == null && typeof cleanup === 'function') {
          cleanup();
        }
      } else {
        ref.value = instance;
      }
    }
  };
}

export function useMergedRefsN<I>(refs: InputRef<I>[]): ((instance: I | null) => void) | null {
  return useMergedRefs(...refs);
}

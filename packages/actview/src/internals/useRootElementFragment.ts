import {getCurrentInstance, onBeforeUnmount, onMounted, onUpdated, ref} from 'actview';
import type { Ref } from 'actview';

/**
 * 递归寻找 vnode 子树的第一个真实 DOM 元素。
 * actview 组件渲染返回 Fragment（`<>{...}</>`）时组件 vnode.el 为 null
 * （Fragment 无自身 DOM）——沿 children 递归取第一个 el。
 * Fragment 单子时 props.children 是单个 vnode（非数组）——两种情况都处理。
 */
function findFirstEl(vnode: any): HTMLElement | null {
  if (!vnode) {
    return null;
  }
  if (vnode.el) {
    return vnode.el as HTMLElement;
  }
  const children = vnode.children ?? vnode.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const el = findFirstEl(child);
      if (el) {
        return el;
      }
    }
  } else if (
    children &&
    typeof children === 'object' &&
    (children.el !== undefined || children.type !== undefined)
  ) {
    // Fragment 单子：children 直接是 vnode
    return findFirstEl(children);
  }
  return null;
}

/**
 * Fragment 根兼容的 useRootElement。
 *
 * actview 内置 useRootElement 读 `subTree.el` 推导组件根 DOM——组件渲染
 * 返回 Fragment（`<>{element()}</>`）时 subTree.el 恒 null，其 onMounted
 * sync 会把模板 ref 设置的值覆盖为 null，导致 ref 契约（render 函数的
 * props.ref 指向根 DOM）失效。本 hook 在 Fragment 下沿 children 递归取
 * 第一个真实 DOM，其余语义与 useRootElement 一致。
 */
export function useRootElementFragment(): Ref<HTMLElement | null> {
  const self = getCurrentInstance() as (any & { subTree?: any }) | null;
  const rootRef = ref<HTMLElement | null>(null);
  const sync = () => {
    const subTree = self?.subTree;
    rootRef.value = subTree ? (subTree.el ?? findFirstEl(subTree)) : null;
  };
  onMounted(sync);
  onUpdated(sync);
  // 卸载置 null（对齐模板 ref 语义：卸载 → null）。
  onBeforeUnmount(() => {
    rootRef.value = null;
  });
  return rootRef;
}

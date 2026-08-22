import type { VNode } from '@actview/jsx';

/**
 * ActView 版 `React.cloneElement`：把 `extraProps` 浅合并进 VNode 的 props，
 * 返回一个新 VNode（原 VNode 不变）。
 *
 * actview 没有 cloneElement，而 conformance 用例需要「带新 props 重新渲染被
 * 测试元素」——`createRenderer.render(Component, props)` 的调用方（测试的
 * `render` 选项）拿到克隆后的 VNode 后取 `node.type` / `node.props` 渲染即可。
 */
export function cloneVNode(
  vnode: VNode,
  extraProps: Record<string, unknown> = {},
): VNode {
  return {
    ...vnode,
    props: {
      ...(vnode.props ?? {}),
      ...extraProps,
    },
  };
}

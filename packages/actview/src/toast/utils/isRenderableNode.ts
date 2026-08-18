import type { VNode, VNodeChild } from '@actview/jsx';

export function isRenderableNode(node: VNodeChild): boolean {
  if (node == null || typeof node === 'boolean' || node === '') {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(isRenderableNode);
  }
  return true;
}

export function hasRenderableChildren(element: VNode | null): boolean {
  return (
    element != null &&
    isRenderableNode((element.props as { children?: VNodeChild } | undefined)?.children)
  );
}

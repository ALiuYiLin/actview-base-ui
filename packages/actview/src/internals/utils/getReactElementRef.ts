/**
 * 从渲染节点提取 ref。
 * VNode 形态与 React 19 一致
 * （createVNode: { $$typeof, type, key, ref: null, props }——ref 恒在 props.ref）。
 */
export function getReactElementRef(element: unknown): any | null {
  const el = element as { props?: { ref?: any } | null } | null | undefined
  if (!el || typeof el !== 'object' || !el.props) return null
  return el.props.ref ?? null
}

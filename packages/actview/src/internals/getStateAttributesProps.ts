// ============================================================
// getStateAttributesProps —— state → data-* 属性的默认映射：
//   true            → data-<key>=""          （布尔开关形态）
//   其他真值         → data-<key>="String(v)"
//   falsy(undefined/null/false) → 不产出
// 注：aria-*/data-* 的**布尔值**规范化（true→"true"、false→"false" 不移除）
// 在 renderer setProp 层统一处理（PD-01/19），本函数只负责 state→data-* 映射。
// StateAttributesMapping 允许逐键自定义：返回 null 表示该键不产出任何属性。
// ============================================================

export type StateAttributesMapping<State> = {
  [Property in keyof State]?: (
    state: State[Property],
  ) => Record<string, string> | null
}

export function getStateAttributesProps<State extends Record<string, any>>(
  state: State,
  customMapping?: StateAttributesMapping<State>,
) {
  const props: Record<string, string> = {}

  /* eslint-disable-next-line guard-for-in */
  for (const key in state) {
    const value = state[key]

    if (customMapping?.hasOwnProperty(key)) {
      const customProps = customMapping[key]!(value)
      if (customProps != null) {
        Object.assign(props, customProps)
      }

      continue
    }

    if (value === true) {
      props[`data-${key.toLowerCase()}`] = '';
    } else if (value) {
      props[`data-${key.toLowerCase()}`] = value.toString();
    }
  }

  return props
}

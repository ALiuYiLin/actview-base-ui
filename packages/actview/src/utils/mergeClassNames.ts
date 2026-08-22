/**
 * 合并两个 className 字符串，两者都保留（对齐 React `mergeClassNames` 契约）。
 * 顺序 = 参数顺序：VNode render 形态下调用为
 * `mergeClassNames(render.props.className, merged.className)`——
 * render 元素 className 在前、组件 className 在后（与 React 一致）。
 */
export function mergeClassNames(
  renderClassName: string | undefined,
  componentClassName: string | undefined,
) {
  if (renderClassName) {
    if (componentClassName) {
      return `${renderClassName} ${componentClassName}`;
    }
    return renderClassName;
  }
  return componentClassName;
}

/**
 * 合并两个 style（对齐 React `mergeObjects` 契约：浅合并，后者覆盖前者同名键）。
 * 对象按 `{ ...a, ...b }` 合并；字符串形态不合并，直接后者优先。
 */
export function mergeStyles(
  renderStyle: string | Record<string, string | number> | undefined,
  componentStyle: string | Record<string, string | number> | undefined,
) {
  if (renderStyle && !componentStyle) {
    return renderStyle;
  }
  if (!renderStyle && componentStyle) {
    return componentStyle;
  }
  if (renderStyle || componentStyle) {
    if (typeof renderStyle === 'string' || typeof componentStyle === 'string') {
      return componentStyle ?? renderStyle;
    }
    return { ...renderStyle, ...componentStyle };
  }
  return undefined;
}

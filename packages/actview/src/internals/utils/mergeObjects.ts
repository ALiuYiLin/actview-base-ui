/** 浅合并两个对象：单侧缺失直接返回另一侧；双侧都有生成新对象。
 *  style 允许字符串形态（cssText，如 `style="border: 1px solid #ddd"`）——
 *  字符串无法按 key 浅合并，直接整体覆盖（右侧优先，对齐"外部 props
 *  覆盖内部"的合并语义；否则 `{...a, ...'str'}` 展开成数字索引键，
 *  core setProp 写 `el.style['0']` 抛 Indexed property setter 错误）。 */
export function mergeObjects<A extends object | string | undefined, B extends object | string | undefined>(
  a: A,
  b: B,
) {
  if (typeof a === 'string' || typeof b === 'string') {
    return (b ?? a) as any;
  }
  if (a && !b) {
    return a;
  }
  if (!a && b) {
    return b;
  }
  if (a || b) {
    return { ...(a as object), ...(b as object) };
  }
  return undefined;
}

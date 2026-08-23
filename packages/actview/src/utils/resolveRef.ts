/**
 * If the provided argument is a ref object ({current} 或 {value}), returns its
 * value. Otherwise, returns the argument itself.
 *
 * (注意：DOM 元素（如 HTMLInputElement）自身带 `.value` 属性，必须先排除，
 * 否则会误把元素当 ref 解包成其 value 字符串。)
 */
export function resolveRef<T extends HTMLElement | null | undefined>(
  maybeRef: T | {current: T} | {value: T},
): T {
  if (maybeRef == null) {
    return maybeRef;
  }

  if ('current' in maybeRef) {
    return (maybeRef as {current: T}).current;
  }

  if (typeof maybeRef === 'object' && !('nodeType' in maybeRef) && 'value' in maybeRef) {
    return (maybeRef as {value: T}).value;
  }

  return maybeRef as T;
}

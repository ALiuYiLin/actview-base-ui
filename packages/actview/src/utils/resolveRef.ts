/**
 * If the provided argument is a ref object ({current} 或 {value}), returns its
 * value. Otherwise, returns the argument itself.
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

  if ('value' in maybeRef) {
    return (maybeRef as {value: T}).value;
  }

  return maybeRef as T;
}

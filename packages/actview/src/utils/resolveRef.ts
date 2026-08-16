/**
 * If the provided argument is a ref object, returns its `current` or `value` content.
 * Otherwise, returns the argument itself.
 */
export function resolveRef<T extends HTMLElement | null | undefined>(
  maybeRef: T | { current?: T; value?: T },
): T {
  if (maybeRef == null) {
    return maybeRef;
  }

  if ('current' in maybeRef) {
    return maybeRef.current as T;
  }

  if ('value' in maybeRef) {
    return maybeRef.value as T;
  }

  return maybeRef as T;
}

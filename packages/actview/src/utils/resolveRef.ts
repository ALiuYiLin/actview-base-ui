/**
 * If the provided argument is a ref object, returns its `current` or `value` content.
 * Otherwise, returns the argument itself.
 *
 * ActView's DOM ref handling writes object refs through `.value` (see `applyRef`), while Base UI
 * internal refs keep the React-style `{ current }` shape, so both fields are considered. DOM
 * elements can also expose a `value` property (buttons, inputs, selects), so elements are detected
 * first via `nodeType` and returned as-is.
 */
export function resolveRef<T extends HTMLElement | null | undefined>(
  maybeRef: T | { current?: T; value?: T },
): T {
  if (maybeRef == null) {
    return maybeRef;
  }

  if ((maybeRef as { nodeType?: unknown }).nodeType != null) {
    return maybeRef as T;
  }

  if ('current' in maybeRef || 'value' in maybeRef) {
    return ((maybeRef as { current?: T; value?: T }).current ??
      (maybeRef as { current?: T; value?: T }).value) as T;
  }

  return maybeRef as T;
}

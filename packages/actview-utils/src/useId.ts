let globalId = 0;

/**
 * Returns a stable unique identifier for the current component instance, or the provided
 * override when given.
 *
 * ActView has no equivalent of `React.useId`'s SSR-stable identifiers, so this implementation
 * falls back to a process-wide incrementing id. Ids are therefore not guaranteed to match
 * between server-side rendering and client-side hydration.
 *
 * @example <div id={useId()} />
 * @param idOverride - An explicit id to use instead of the generated one.
 * @param prefix - Prefix for the generated id. Defaults to `'mui'`.
 * @returns The override id, or a generated id of the form `${prefix}-${n}`.
 */
export function useId(idOverride?: string, prefix: string = 'mui'): string | undefined {
  if (idOverride) {
    return idOverride;
  }
  globalId += 1;
  return prefix ? `${prefix}-${globalId}` : `${globalId}`;
}

/**
 * ActView has no server-rendering hydration phase, so there is never a "hydrating" state.
 *
 * The React version uses `useSyncExternalStore` to return `true` while hydrating
 * server-rendered markup and `false` for fresh client-only mounts. ActView components are
 * always mounted client-side, so this returns the React version's client snapshot (`false`).
 */
export function useIsHydrating() {
  return false;
}

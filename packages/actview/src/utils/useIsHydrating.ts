/**
 * actview 无 SSR/hydration——恒返回 `false`（fresh client mount 语义）。
 * （React 版 useIsHydrating 的客户端快照即 false。）
 */
export function useIsHydrating(): boolean {
  return false;
}

/**
 * Merges multiple cleanup functions into a single one, calling them all in reverse order.
 * (本地实现：等价于 @base-ui/utils/mergeCleanups。)
 */
export function mergeCleanups(...cleanups: Array<(() => void) | undefined | false | null>) {
  const filtered = cleanups.filter(Boolean) as Array<() => void>;
  return () => {
    for (let i = filtered.length - 1; i >= 0; i -= 1) {
      filtered[i]();
    }
  };
}

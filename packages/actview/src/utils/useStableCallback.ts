import { watch } from 'actview';

/**
 * Returns a stable callback whose identity never changes but always invokes the latest
 * function passed in. Mirrors React 版 useStableCallback（`@base-ui/utils/useStableCallback`）.
 */
export function useStableCallback<Fn extends (...args: any[]) => any>(fn: Fn): Fn {
  const fnRef = {current: fn};

  watch(
    () => fn,
    (v) => {
      fnRef.current = v;
    },
    {flush: 'sync'},
  );

  const stable = (...args: any[]) => fnRef.current(...args);
  return stable as Fn;
}

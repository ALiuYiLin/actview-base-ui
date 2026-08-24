import {watch, ref} from 'actview';

/**
 * Returns a stable callback whose identity never changes but always invokes the latest
 * function passed in. Mirrors React 版 useStableCallback（`@base-ui/utils/useStableCallback`）.
 */
export function useStableCallback<Fn extends (...args: any[]) => any>(fn: Fn): Fn {
  const fnRef = ref(fn);

  watch(
    () => fn,
    (v) => {
      fnRef.value = v;
    },
    {flush: 'sync'},
  );

  const stable = (...args: any[]) => fnRef.value(...args);
  return stable as Fn;
}

import { onMounted, onUnmounted } from 'actview';

type EffectCallback = () => void | (() => void);

/**
 * ActView has no layout phase; effects run after the DOM is mounted, which is the closest
 * equivalent to `React.useLayoutEffect` (and to `React.useEffect` on the server, where
 * `useLayoutEffect` is a no-op).
 */
export function useIsoLayoutEffect(fn: EffectCallback, _deps?: readonly unknown[]) {
  let cleanup: (() => void) | void;
  onMounted(() => {
    cleanup = fn();
  });
  onUnmounted(() => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  });
}

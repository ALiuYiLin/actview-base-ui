import { onMounted, onUnmounted } from 'actview';

type EffectCallback = () => void | (() => void);

/**
 * Runs once, when the component is mounted. If the callback returns a cleanup function,
 * it is called when the component is unmounted.
 */
export function useOnMount(fn: EffectCallback) {
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

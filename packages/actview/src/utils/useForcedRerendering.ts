import { ref } from 'actview';

/**
 * Returns a function that forces a rerender.
 * (actview 版：计数器 ref 触发响应式更新)
 */
export function useForcedRerendering() {
  const rerender = ref(0);

  return () => {
    rerender.value += 1;
  };
}

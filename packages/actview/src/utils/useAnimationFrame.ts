import {ref} from 'actview';
type FrameCallback = (timestamp: number) => void;

/**
 * rAF 调度器（actview 简化版）：request/cancel 一对。
 */
export function useAnimationFrame() {
  const frameId = ref(null as number | null);

  return {
    request(callback: FrameCallback) {
      frameId.value = requestAnimationFrame(callback);
    },
    cancel() {
      if (frameId.value != null) {
        cancelAnimationFrame(frameId.value);
        frameId.value = null;
      }
    },
  };
}

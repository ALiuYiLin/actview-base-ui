type FrameCallback = (timestamp: number) => void;

/**
 * rAF 调度器（actview 简化版）：request/cancel 一对。
 */
export function useAnimationFrame() {
  const frameId = {current: null as number | null};

  return {
    request(callback: FrameCallback) {
      frameId.current = requestAnimationFrame(callback);
    },
    cancel() {
      if (frameId.current != null) {
        cancelAnimationFrame(frameId.current);
        frameId.current = null;
      }
    },
  };
}

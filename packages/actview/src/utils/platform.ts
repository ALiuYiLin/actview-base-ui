/**
 * actview 简化版 platform 检测（仅保留 scroll-area 使用的 webkit 引擎标志）。
 */
export const platform = {
  engine: {
    webkit:
      typeof navigator !== 'undefined' && /WebKit/i.test(navigator.userAgent),
  },
};

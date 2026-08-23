/**
 * actview 简化版 platform 检测（仅保留 scroll-area/number-field 使用的标志）。
 */
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

export const platform = {
  os: {
    ios: /iPad|iPhone|iPod/.test(userAgent),
    android: /Android/i.test(userAgent),
    mac: /Mac/i.test(userAgent) && !/iPhone|iPad|iPod/i.test(userAgent),
  },
  engine: {
    webkit: /WebKit/i.test(userAgent),
    gecko: /Gecko\//i.test(userAgent) && !/WebKit/i.test(userAgent),
  },
  env: {
    jsdom: typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent),
  },
};

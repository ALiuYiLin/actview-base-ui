import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { reset as resetError } from '@base-ui/actview-utils/error';
import { resetAnimationFrameScheduler } from '@base-ui/actview-utils/useAnimationFrame';
import { cleanup } from '@actview/testing';

declare global {
  // eslint-disable-next-line vars-on-top
  var BASE_UI_ANIMATIONS_DISABLED: boolean;
}

afterEach(() => {
  vi.resetAllMocks();
  cleanup();
  resetError();
  resetAnimationFrameScheduler();
  globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
});

globalThis.BASE_UI_ANIMATIONS_DISABLED = true;

if (typeof window !== 'undefined' && window?.navigator?.userAgent?.includes('jsdom')) {
  // 与 floating-ui/actview 的 setupTests.ts 对齐：rAF 同步执行（floating-ui
  // 的 useListNavigation/enqueueFocus 依赖同步 rAF 完成打开时的焦点同步；
  // 异步 setTimeout 会导致嵌套菜单打开后首项未聚焦的时序失败）。
  globalThis.requestAnimationFrame = (cb) => {
    cb(0);
    return 0;
  };
}

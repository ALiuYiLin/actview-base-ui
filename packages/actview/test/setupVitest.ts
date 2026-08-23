import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { reset as resetError } from '@base-ui/actview-utils/error';
import { resetAnimationFrameScheduler } from '@base-ui/actview-utils/useAnimationFrame';
import { cleanup } from '@actview/testing';
// rtl（floating-ui 迁移测试层）自行创建的挂载容器（id="testing-N"）与
// portal 节点，@actview/testing 的 cleanup 不负责移除；用例间必须清理，
// 否则残留容器里的 data-testid 会让后续 getByTestId 命中多个元素。
import { cleanup as rtlCleanup } from './rtl';

declare global {
  // eslint-disable-next-line vars-on-top
  var BASE_UI_ANIMATIONS_DISABLED: boolean;
}

afterEach(() => {
  vi.resetAllMocks();
  cleanup();
  rtlCleanup();
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

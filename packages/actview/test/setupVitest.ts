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

// 与 floating-ui/actview 的 setupTests.ts 对齐：rAF 同步执行（floating-ui
// 的 useListNavigation/enqueueFocus 依赖同步 rAF 完成打开时的焦点同步；
// 异步 setTimeout 会导致嵌套菜单打开后首项未聚焦的时序失败）。
//
// jsdom 与 chromium 浏览器环境统一同步化：
// - 真实 rAF 下 act()/settle() 只 flush 微任务，不推进渲染帧，导致
//   useClick mousedown 打开路径（frame.request）的 setOpen 永不执行
//   （Dialog/AlertDialog/Drawer 家族在浏览器全挂）；同步 rAF 消除该时序差。
// - 真实 rAF 每帧等待使浏览器全量测试从 ~20s 暴涨到 340s+（730+ 次
//   act × headless 帧成本）；同步 rAF 下 act 的 flush 零成本。
// 代码库无"回调内无条件自再调度 rAF"的无限循环（Scheduler.tick 单次推进、
// doubleRaf 固定两层、enqueueFocus 单次），同步化不会栈溢出。
//
// 条件同步：默认（BASE_UI_ANIMATIONS_DISABLED=true，动画禁用）时 rAF 同步
// 执行；显式启用动画的测试（BASE_UI_ANIMATIONS_DISABLED=false，如
// AvatarImage 动画用例）走原生 rAF——同步 rAF 下 transition 类在同一同步栈
// 加/移除、浏览器无渲染帧，CSS transition 不实际执行 → transitionend 不触发。
if (typeof window !== 'undefined') {
  const nativeRequestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
  globalThis.requestAnimationFrame = (cb) => {
    if (globalThis.BASE_UI_ANIMATIONS_DISABLED) {
      cb(0);
      return 0;
    }
    return nativeRequestAnimationFrame(cb);
  };
}

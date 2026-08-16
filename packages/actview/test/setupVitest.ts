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
  globalThis.requestAnimationFrame = (cb) => {
    setTimeout(() => cb(0), 0);
    return 0;
  };
}

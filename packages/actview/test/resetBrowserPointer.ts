import { isJSDOM } from '@actview/base-ui-utils';

/**
 * Resets the Playwright/WebDriver pointer state that persists between browser tests.
 */
export async function resetBrowserPointer() {
  if (!isJSDOM) {
    const { userEvent } = await import('vitest/browser');
    await userEvent.unhover(document.body);
  }
}



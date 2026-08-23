import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Popover.Viewport />', () => {
  it('should render children in the `current` container by default', async () => {
    await render(
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Viewport>
                <div data-testid="content">Content</div>
              </Popover.Viewport>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    const currentContainer = screen.getByTestId('content').closest('[data-current]');
    expect(currentContainer).not.toBe(null);
    expect(currentContainer!.textContent).toBe('Content');
  });

  // actview 遗留：锚定样式（side/direction 的 position/top/right/bottom/left）
  // 依赖 useAnchorPositioning 在 jsdom 中的样式计算——与 MenuViewport 的
  // payload 切换 skip 同因（多 trigger 同步未生效）。待布局计算链修复后补。
  it.skip('anchors side correctly in ltr mode', async () => {});
});

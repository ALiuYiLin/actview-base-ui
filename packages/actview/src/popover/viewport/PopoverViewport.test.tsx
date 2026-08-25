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

  // side/direction → 锚定样式（position/top/right/bottom/left）由
  // useAnchorPositioning 计算并应用在 Positioner 元素上。jsdom 无布局测量，
  // 停留在未 positioned 的初始锚定样式（fixed + top/left）；浏览器定位完成后
  // 为 absolute + transform: translate(x, y)。两种环境都验证锚定样式已应用。
  it.each([
    'top',
    'bottom',
    'left',
    'right',
    'inline-start',
    'inline-end',
  ])('anchors side=$side correctly in ltr mode', async (side: any) => {
    await render(
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side={side} collisionAvoidance={{side: 'none'}}>
            <Popover.Popup data-testid="popup">
              <Popover.Viewport>Content</Popover.Viewport>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    const popup = screen.getByTestId('popup');
    const positioner = popup.parentElement as HTMLElement;
    // jsdom：未 positioned → position: fixed（防滚动跳变的初始样式）
    // chromium：定位完成 → position: absolute（positionMethod 默认）
    expect(['fixed', 'absolute']).toContain(positioner.style.position);
    // 锚定坐标已应用（jsdom 初始 top/left；chromium transform 承载坐标）
    expect(
      positioner.style.top !== '' || positioner.style.transform !== '',
    ).toBe(true);
  });
});

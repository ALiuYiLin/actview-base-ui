import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.Viewport />', () => {
  it('should render children in the `current` container by default', async () => {
    await render(
      <Menu.Root open>
        <Menu.Trigger>Trigger</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Viewport>
                <div data-testid="content">Content</div>
              </Menu.Viewport>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const currentContainer = screen.getByTestId('content').closest('[data-current]');
    expect(currentContainer).not.toBe(null);
    expect(currentContainer!.textContent).toBe('Content');
  });

  // react 版验证「active trigger 变化时 current 容器重挂」。
  // payload 经 MenuRoot 的 render prop（render 期 children 求值）同步。
  it('should remount the `current` container when the active trigger changes', async () => {
    await render(
      <Menu.Root>
        {({payload}: any) => (
          <>
            <Menu.Trigger payload="first" data-testid="trigger1">
              Trigger 1
            </Menu.Trigger>
            <Menu.Trigger payload="second" data-testid="trigger2">
              Trigger 2
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.Viewport>
                    {payload === 'first' ? (
                      <img data-testid="payload-image-1" src="about:blank" alt="Preview 1" />
                    ) : null}
                    {payload === 'second' ? (
                      <img data-testid="payload-image-2" src="about:blank" alt="Preview 2" />
                    ) : null}
                  </Menu.Viewport>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </>
        )}
      </Menu.Root>,
    );
    await settle();

    const trigger1 = screen.getByTestId('trigger1');
    const trigger2 = screen.getByTestId('trigger2');

    fireEvent.mouseDown(trigger1);
    fireEvent.mouseUp(trigger1);
    fireEvent.click(trigger1);
    await settle();
    await settle();

    const firstImage = await screen.findByTestId('payload-image-1');
    const firstContainer = firstImage.closest('[data-current]');
    expect(firstContainer).not.toBe(null);

    fireEvent.mouseDown(trigger2);
    fireEvent.mouseUp(trigger2);
    fireEvent.click(trigger2);
    await settle();
    await settle();

    await waitFor(() => {
      const secondImage = screen.getByTestId('payload-image-2');
      const secondContainer = secondImage.closest('[data-current]');
      expect(secondContainer).not.toBe(null);
      expect(secondContainer).not.toBe(firstContainer);
    });
  });

  // react 版的 morphing 容器/方向计算测试依赖 CSS 动画与布局测量，jsdom 下跳过。
});

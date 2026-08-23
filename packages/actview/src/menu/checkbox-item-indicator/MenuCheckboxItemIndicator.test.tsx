import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.CheckboxItemIndicator />', () => {
  it('renders with the checked state when the item is checked', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.CheckboxItem checked>
                <Menu.CheckboxItemIndicator data-testid="indicator" />
              </Menu.CheckboxItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator).toHaveAttribute('data-checked');
  });

  it('does not render when the item is unchecked without keepMounted', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.CheckboxItem checked={false}>
                <Menu.CheckboxItemIndicator data-testid="indicator" />
              </Menu.CheckboxItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    expect(screen.queryByTestId('indicator')).toBe(null);
  });

  it('renders with the unchecked state when keepMounted', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.CheckboxItem checked={false}>
                <Menu.CheckboxItemIndicator keepMounted data-testid="indicator" />
              </Menu.CheckboxItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator).toHaveAttribute('data-unchecked');
  });

  // react 版的退出动画/动画结束测试依赖浏览器环境（requestAnimationFrame + CSS
  // animation），jsdom 下跳过（isJSDOM 语义）。
});

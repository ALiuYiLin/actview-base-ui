import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.RadioItemIndicator />', () => {
  it('renders with the checked state when the item is selected', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue="a">
                <Menu.RadioItem value="a">
                  <Menu.RadioItemIndicator data-testid="indicator" />
                </Menu.RadioItem>
              </Menu.RadioGroup>
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

  it('does not render when the item is not selected without keepMounted', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue="a">
                <Menu.RadioItem value="b">
                  <Menu.RadioItemIndicator data-testid="indicator" />
                </Menu.RadioItem>
              </Menu.RadioGroup>
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
              <Menu.RadioGroup defaultValue="a">
                <Menu.RadioItem value="b">
                  <Menu.RadioItemIndicator keepMounted data-testid="indicator" />
                </Menu.RadioItem>
              </Menu.RadioGroup>
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

  // react 版的退出动画/动画结束测试依赖浏览器环境，jsdom 下跳过。
});

import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.Portal />', () => {
  it('renders the menu in a portal attached to the body by default', async () => {
    await render(
      <Menu.Root open>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal data-testid="portal-root">
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item>Item</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const menu = screen.getByRole('menu');
    expect(document.body.contains(menu)).toBe(true);
  });
});

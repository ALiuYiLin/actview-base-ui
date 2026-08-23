import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.LinkItem />', () => {
  it('renders an anchor element with the href', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.LinkItem href="https://example.com">Link</Menu.LinkItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const link = screen.getByRole('menuitem', {name: 'Link'});
    expect(link).toBeInstanceOf(window.HTMLAnchorElement);
    expect(link).toHaveAttribute('href', 'https://example.com');
  });
});

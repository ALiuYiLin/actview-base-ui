import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.CheckboxItem />', () => {
  it('toggles the checked state when clicked', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.CheckboxItem>Bold</Menu.CheckboxItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const item = screen.getByRole('menuitemcheckbox');
    expect(item).toHaveAttribute('data-unchecked');

    fireEvent.mouseUp(item);
    fireEvent.click(item);
    await settle();

    expect(item).toHaveAttribute('data-checked');
    expect(item).toHaveAttribute('aria-checked', 'true');

    fireEvent.mouseUp(item);
    fireEvent.click(item);
    await settle();

    expect(item).toHaveAttribute('data-unchecked');
    expect(item).toHaveAttribute('aria-checked', 'false');
  });
});

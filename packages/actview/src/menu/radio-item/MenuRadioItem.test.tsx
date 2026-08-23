import { describe, expect, it, vi } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.RadioItem />', () => {
  it('adds the state and ARIA attributes when selected', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue="1">
                <Menu.RadioItem value="1">One</Menu.RadioItem>
                <Menu.RadioItem value="2">Two</Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const items = screen.getAllByRole('menuitemradio');
    expect(items[0]).toHaveAttribute('aria-checked', 'true');
    expect(items[0]).toHaveAttribute('data-checked');
    expect(items[1]).toHaveAttribute('aria-checked', 'false');
    expect(items[1]).toHaveAttribute('data-unchecked');
  });

  it('calls `onValueChange` when the item is clicked and updates selection', async () => {
    const onValueChange = vi.fn();
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue="1" onValueChange={onValueChange}>
                <Menu.RadioItem value="1">One</Menu.RadioItem>
                <Menu.RadioItem value="2">Two</Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const items = screen.getAllByRole('menuitemradio');
    fireEvent.mouseUp(items[1]);
    fireEvent.click(items[1]);
    await settle();

    expect(onValueChange).toHaveBeenCalledWith('2', expect.objectContaining({}));
    expect(items[1]).toHaveAttribute('aria-checked', 'true');
    expect(items[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('does not close the menu when the item is clicked by default', async () => {
    await render(
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup>
                <Menu.RadioItem value="1">One</Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    const item = screen.getByRole('menuitemradio');
    fireEvent.mouseUp(item);
    fireEvent.click(item);
    await settle();

    expect(screen.queryByRole('menu')).not.toBe(null);
  });
});

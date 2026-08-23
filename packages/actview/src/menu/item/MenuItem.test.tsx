import { describe, expect, it, vi } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

async function renderOpenMenuWithItem(itemProps?: any) {
  await render(
    <Menu.Root>
      <Menu.Trigger>Open</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item {...itemProps}>Item</Menu.Item>
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
}

describe('<Menu.Item />', () => {
  it('renders with the `menuitem` role and closes the menu when clicked', async () => {
    const onClick = vi.fn();
    await renderOpenMenuWithItem({onClick});

    const item = screen.getByRole('menuitem', {name: 'Item'});
    expect(item).toHaveAttribute('tabindex', '-1');

    fireEvent.mouseUp(item);
    fireEvent.click(item);
    await settle();
    await settle();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBe(null);
  });

  it('does not close the menu when onClick prevents the Base UI handler', async () => {
    const onClick = (event: any) => {
      event.preventBaseUIHandler();
    };
    await renderOpenMenuWithItem({onClick});

    const item = screen.getByRole('menuitem', {name: 'Item'});
    fireEvent.mouseUp(item);
    fireEvent.click(item);
    await settle();
    await settle();

    expect(screen.queryByRole('menu')).not.toBe(null);
  });

  it('selects the item with Enter and closes the menu', async () => {
    const onClick = vi.fn();
    await renderOpenMenuWithItem({onClick});

    const item = screen.getByRole('menuitem', {name: 'Item'});
    item.focus();
    await settle();

    fireEvent.keyDown(item, {key: 'Enter'});
    await settle();
    await settle();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBe(null);
  });
});

import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act, userEvent } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger>Toggle</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item data-testid="item-1">Item 1</Menu.Item>
            <Menu.Item data-testid="item-2">Item 2</Menu.Item>
            <Menu.Item data-testid="item-3" disabled>
              Item 3
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

async function openMenu() {
  await render(<TestMenu />);
  await settle();

  const trigger = screen.getByRole('button', {name: 'Toggle'});
  fireEvent.mouseDown(trigger);
  fireEvent.mouseUp(trigger);
  fireEvent.click(trigger);
  await settle();
}

function pressKeyOnFirstItem(key: string) {
  const item = screen.getAllByRole('menuitem')[0];
  item.focus();
  fireEvent.keyDown(item, {key});
}

describe('<Menu.Root />', () => {
  it('changes the highlighted item using the arrow keys', async () => {
    await openMenu();

    const item1 = screen.getByTestId('item-1');
    const item2 = screen.getByTestId('item-2');
    const item3 = screen.getByTestId('item-3');

    // The first item is highlighted by default after opening.
    expect(item1).toHaveAttribute('data-highlighted');

    pressKeyOnFirstItem('ArrowDown');
    await settle();
    expect(item2).toHaveAttribute('data-highlighted');

    pressKeyOnFirstItem('ArrowDown');
    await settle();
    expect(item3).toHaveAttribute('data-highlighted');

    pressKeyOnFirstItem('Home');
    await settle();
    expect(item1).toHaveAttribute('data-highlighted');

    pressKeyOnFirstItem('End');
    await settle();
    expect(item3).toHaveAttribute('data-highlighted');
  });

  it('includes disabled items during keyboard navigation', async () => {
    await openMenu();

    const item1 = screen.getByTestId('item-1');
    const disabledItem3 = screen.getByTestId('item-3');

    expect(item1).toHaveAttribute('data-highlighted');

    pressKeyOnFirstItem('ArrowDown');
    await settle();
    pressKeyOnFirstItem('ArrowDown');
    await settle();

    expect(disabledItem3).toHaveAttribute('data-highlighted');
    expect(disabledItem3).toHaveAttribute('aria-disabled', 'true');
  });

  it('closes the menu when clicking outside', async () => {
    await render(
      <div>
        <TestMenu />
        <button data-testid="outside">Outside</button>
      </div>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Toggle'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();
    expect(screen.queryByRole('menu')).not.toBe(null);

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);
    fireEvent.mouseUp(outside);
    fireEvent.click(outside);
    await settle();
    await settle();

    expect(screen.queryByRole('menu')).toBe(null);
  });
});

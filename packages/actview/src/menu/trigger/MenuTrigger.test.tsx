import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act, userEvent } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestMenu(props: any) {
  return (
    <Menu.Root>
      <Menu.Trigger {...props.triggerProps}>Open</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>Item</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

describe('<Menu.Trigger />', () => {
  it('renders a button with aria-haspopup and opens the menu on click', async () => {
    await render(<TestMenu />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).toBe(null);

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('should render a disabled button and not open the menu when clicked', async () => {
    await render(<TestMenu triggerProps={{disabled: true}} />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    expect(trigger).toHaveAttribute('disabled');

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    expect(screen.queryByRole('menu')).toBe(null);
  });

  it('opens the menu when pressing Enter on the button', async () => {
    await render(<TestMenu />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    trigger.focus();
    await settle();

    const user = userEvent.setup();
    await user.keyboard('[Enter]');
    await settle();
    await settle();

    expect(screen.queryByRole('menu', {hidden: true})).not.toBe(null);
  });
});

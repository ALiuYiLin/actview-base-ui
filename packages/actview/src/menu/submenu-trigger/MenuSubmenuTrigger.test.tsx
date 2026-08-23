import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act, userEvent } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function SubmenuTest(props: any) {
  return (
    <Menu.Root>
      <Menu.Trigger>Open</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>One</Menu.Item>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger {...props.submenuTriggerProps}>Sub</Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Item>Child</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

async function openParentMenu() {
  await render(<SubmenuTest />);
  await settle();

  const trigger = screen.getByRole('button', {name: 'Open'});
  fireEvent.mouseDown(trigger);
  fireEvent.mouseUp(trigger);
  fireEvent.click(trigger);
  await settle();
}

describe('<Menu.SubmenuTrigger />', () => {
  it('opens the submenu on click', async () => {
    await openParentMenu();
    expect(screen.getAllByRole('menu').length).toBe(1);

    const submenuTrigger = screen.getByRole('menuitem', {name: 'Sub'});
    fireEvent.mouseDown(submenuTrigger);
    fireEvent.mouseUp(submenuTrigger);
    fireEvent.click(submenuTrigger);
    await settle();
    await settle();

    expect(screen.getAllByRole('menu').length).toBe(2);
    expect(screen.getByRole('menuitem', {name: 'Child'})).toBeVisible();
  });

  it('opens the submenu on hover after the delay', async () => {
    await render(<SubmenuTest submenuTriggerProps={{delay: 0, closeDelay: 0}} />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    const submenuTrigger = screen.getByRole('menuitem', {name: 'Sub'});
    const user = userEvent.setup();
    await user.hover(submenuTrigger);
    await settle();
    await settle();

    expect(screen.getAllByRole('menu').length).toBe(2);
  });

  it('does not open on hover when disabled', async () => {
    await render(<SubmenuTest submenuTriggerProps={{disabled: true}} />);
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    const submenuTrigger = screen.getByRole('menuitem', {name: 'Sub'});
    expect(submenuTrigger).toHaveAttribute('aria-disabled', 'true');

    const user = userEvent.setup();
    await user.hover(submenuTrigger);
    await settle();
    await settle();

    expect(screen.getAllByRole('menu').length).toBe(1);
  });
});

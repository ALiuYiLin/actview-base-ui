import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

async function openAndCloseMenu(popupProps?: any, targetRef?: {current: HTMLElement | null}) {
  await render(
    <div>
      <input />
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup {...popupProps}>
              <Menu.Item>Close</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <input
        data-testid="input-to-focus"
        ref={(el: HTMLInputElement | null) => {
          if (targetRef) {
            targetRef.current = el;
          }
        }}
      />
    </div>,
  );
  await settle();

  const trigger = screen.getByRole('button', {name: 'Open'});
  fireEvent.mouseDown(trigger);
  fireEvent.mouseUp(trigger);
  fireEvent.click(trigger);
  await settle();

  const closeItem = screen.getByRole('menuitem', {name: 'Close'});
  fireEvent.mouseUp(closeItem);
  fireEvent.click(closeItem);
  await settle();
  await settle();
}

describe('<Menu.Popup /> finalFocus', () => {
  it('should focus the trigger by default when closed', async () => {
    await openAndCloseMenu();

    const trigger = screen.getByRole('button', {name: 'Open'});
    expect(trigger).toHaveFocus();
  });

  it('should focus the element provided to the prop when closed', async () => {
    const targetRef: {current: HTMLElement | null} = {current: null};
    await openAndCloseMenu({finalFocus: targetRef as any}, targetRef);

    const inputToFocus = screen.getByTestId('input-to-focus');
    expect(inputToFocus).toHaveFocus();
  });

  it('should focus the element provided to `finalFocus` as a function when closed', async () => {
    const targetRef: {current: HTMLElement | null} = {current: null};
    await openAndCloseMenu({finalFocus: () => targetRef.current}, targetRef);

    // eslint-disable-next-line no-console
    console.log('[debug] targetRef.current:', targetRef.current?.tagName, 'input in dom:', !!screen.queryByTestId('input-to-focus'));
    const inputToFocus = screen.getByTestId('input-to-focus');
    expect(inputToFocus).toHaveFocus();
  });

  it('should not move focus when finalFocus is false', async () => {
    const targetRef: {current: HTMLElement | null} = {current: null};
    await openAndCloseMenu({finalFocus: false}, targetRef);

    const inputToFocus = screen.getByTestId('input-to-focus');
    expect(inputToFocus).not.toHaveFocus();
  });
});

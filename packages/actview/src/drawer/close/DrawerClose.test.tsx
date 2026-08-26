import { describe, expect, it } from 'vitest';
import { Drawer } from '@/drawer';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Drawer.Close />', () => {
  it('closes via Drawer.Close', async () => {
    await render(
      <Drawer.Root>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup data-testid="popup">
            <Drawer.Close>Close</Drawer.Close>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();

    fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });
});

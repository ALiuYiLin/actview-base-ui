import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/dialog';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function openViaClick() {
  // dialog 的 useClick 用 mousedown 事件；fireEvent.click 也会派发 mousedown，
  // 重复派发会触发两次 setOpen。只需一次 mouseDown。
  fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));
}

describe('<Dialog.Close />', () => {
  it('disables the button', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Dialog.Root onOpenChange={handleOpenChange}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <Dialog.Close disabled>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    expect(handleOpenChange.mock.calls.length).toBe(0);

    openViaClick();
    await settle();
    await settle();

    expect(handleOpenChange.mock.calls.length).toBe(1);
    expect(handleOpenChange.mock.calls[0][0]).toBe(true);

    const closeButton = screen.getByText('Close');
    expect(closeButton).toHaveAttribute('disabled');
    expect(closeButton).toHaveAttribute('data-disabled');
    fireEvent.click(closeButton);
    await settle();

    expect(handleOpenChange.mock.calls.length).toBe(1);
  });

  it('closes the dialog when undefined is passed to the `onClick` prop', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Dialog.Root onOpenChange={handleOpenChange}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <Dialog.Close onClick={undefined}>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    expect(handleOpenChange.mock.calls.length).toBe(1);

    fireEvent.click(screen.getByText('Close'));
    await settle();
    await settle();

    expect(handleOpenChange.mock.calls.length).toBe(2);
    expect(handleOpenChange.mock.calls[1][0]).toBe(false);
  });

  it('does not close the dialog when the Base UI click handler is prevented', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Dialog.Root defaultOpen modal={false} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Popup>
            <Dialog.Close onClick={(event: any) => event.preventBaseUIHandler()}>
              Close
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(screen.getByRole('dialog')).not.toBe(null);
    expect(handleOpenChange.mock.calls.length).toBe(0);
  });

  it('does not request another close when clicked after the dialog has closed', async () => {
    const handleOpenChange = vi.fn();
    const handleClick = vi.fn();

    await render(
      <Dialog.Root open={false} modal={false} onOpenChange={handleOpenChange}>
        <Dialog.Portal keepMounted>
          <Dialog.Popup>
            <Dialog.Close onClick={handleClick}>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close', hidden: true}));
    await settle();

    expect(handleClick.mock.calls.length).toBe(1);
    expect(handleOpenChange.mock.calls.length).toBe(0);
  });
});




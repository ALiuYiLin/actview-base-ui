import { describe, expect, it, vi } from 'vitest';
import { AlertDialog } from '@/alert-dialog';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function openViaClick() {
  // alert-dialog 的 trigger 用 mousedown 打开（同 dialog）。
  fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));
}

describe('<AlertDialog.Root />', () => {
  it('renders a popup with role alertdialog when open', async () => {
    await render(
      <AlertDialog.Root>
        <AlertDialog.Trigger>Open</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Popup data-testid="popup">
            <p>Alert content</p>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>,
    );
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);

    openViaClick();
    await settle();
    await settle();

    const popup = screen.getByTestId('popup');
    expect(popup).not.toBe(null);
    expect(popup).toHaveAttribute('role', 'alertdialog');
    expect(screen.getByText('Alert content')).not.toBe(null);
  });

  it('supports defaultOpen', async () => {
    await render(
      <AlertDialog.Root defaultOpen>
        <AlertDialog.Trigger>Open</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Popup data-testid="popup">
            <p>Content</p>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });

  it('calls onOpenChange when opened', async () => {
    const onOpenChange = vi.fn();
    await render(
      <AlertDialog.Root onOpenChange={onOpenChange}>
        <AlertDialog.Trigger>Open</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Popup>
            <p>Content</p>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it('closes on Escape', async () => {
    await render(
      <AlertDialog.Root>
        <AlertDialog.Trigger>Open</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Popup data-testid="popup">
            <p>Content</p>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();
    expect(screen.queryByTestId('popup')).not.toBe(null);

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('closes via AlertDialog.Close', async () => {
    await render(
      <AlertDialog.Root>
        <AlertDialog.Trigger>Open</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Popup data-testid="popup">
            <AlertDialog.Close>Close</AlertDialog.Close>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('sets aria-modal on the popup when modal', async () => {
    await render(
      <AlertDialog.Root defaultOpen>
        <AlertDialog.Trigger>Open</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Popup data-testid="popup">
            <p>Content</p>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('popup')).toHaveAttribute('aria-modal', 'true');
  });
});

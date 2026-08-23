import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/dialog';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function openDialog() {
  // dialog 的 useClick 用 mousedown 事件；fireEvent.click 也会派发 mousedown。
  fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));
}

describe('<Dialog.Root />', () => {
  it('renders popup with role dialog when open', async () => {
    await render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Dialog content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);

    openDialog();
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
    expect(screen.getByText('Dialog content')).not.toBe(null);
  });

  it('closes on Escape', async () => {
    await render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openDialog();
    await settle();
    await settle();
    expect(screen.queryByTestId('popup')).not.toBe(null);

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('closes on outside press', async () => {
    await render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openDialog();
    await settle();
    await settle();

    fireEvent.mouseDown(document.body);
    fireEvent.mouseUp(document.body);
    fireEvent.click(document.body);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('supports defaultOpen', async () => {
    await render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });

  it('calls onOpenChange with open state', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Dialog.Root onOpenChange={onOpenChange}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openDialog();
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it('adds modal state attributes and role', async () => {
    await render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    const popup = screen.getByTestId('popup');
    expect(popup).toHaveAttribute('role', 'dialog');
    expect(popup).toHaveAttribute('data-open');
    expect(popup).toHaveAttribute('aria-modal', 'true');
  });

  it('renders a backdrop with role presentation', async () => {
    await render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop data-testid="backdrop" />
          <Dialog.Popup>
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    const backdrop = screen.getByTestId('backdrop');
    expect(backdrop).toHaveAttribute('role', 'presentation');
    expect(backdrop).toHaveAttribute('data-open');
  });

  it('closes via Dialog.Close', async () => {
    await render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openDialog();
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('does not close on outside press when disablePointerDismissal', async () => {
    await render(
      <Dialog.Root disablePointerDismissal>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openDialog();
    await settle();
    await settle();

    fireEvent.mouseDown(document.body);
    fireEvent.mouseUp(document.body);
    fireEvent.click(document.body);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
  });

  it('supports actionsRef close', async () => {
    const actionsRef = {value: null as any};
    await render(
      <Dialog.Root defaultOpen actionsRef={actionsRef}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);

    await act(async () => {
      actionsRef.value.close();
    });
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('focuses the first focusable element in the popup on open', async () => {
    await render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <input data-testid="popup-input" />
            <button>Close</button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openDialog();
    await settle();
    await settle();

    await waitFor(() => {
      expect(screen.getByTestId('popup-input')).toHaveFocus();
    });

    await waitFor(() => {
      expect(screen.getByTestId('popup-input')).toHaveFocus();
    });
  });

  it('returns focus to the trigger on close', async () => {
    await render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <input data-testid="popup-input" />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    openDialog();
    await settle();
    await settle();

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(trigger).toHaveFocus();
  });
});


import { describe, expect, it, vi } from 'vitest';
import { Drawer } from '@/drawer';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function openViaClick() {
  // drawer 的 trigger 用 mousedown 打开（同 dialog）；fireEvent.click 也会派发 mousedown。
  fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));
}

describe('<Drawer.Root />', () => {
  it('opens on trigger press and renders the popup', async () => {
    await render(
      <Drawer.Root>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup data-testid="popup">
            <p>Drawer content</p>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);

    openViaClick();
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);
    expect(screen.getByText('Drawer content')).not.toBe(null);
  });

  it('renders with role dialog', async () => {
    await render(
      <Drawer.Root defaultOpen>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup data-testid="popup">
            <p>Content</p>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();
    await settle();

    const popup = screen.getByTestId('popup');
    expect(popup).toHaveAttribute('role', 'dialog');
    expect(popup).toHaveAttribute('data-open');
  });

  it('closes on Escape', async () => {
    await render(
      <Drawer.Root>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup data-testid="popup">
            <p>Content</p>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
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

  it('closes on outside press', async () => {
    await render(
      <Drawer.Root>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup data-testid="popup">
            <p>Content</p>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    fireEvent.mouseDown(document.body);
    fireEvent.mouseUp(document.body);
    fireEvent.click(document.body);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('calls onOpenChange with the new open state', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Drawer.Root onOpenChange={onOpenChange}>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup>
            <p>Content</p>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it('reports reason close-press when closing via Drawer.Close', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Drawer.Root onOpenChange={onOpenChange}>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Popup>
            <Drawer.Close>Close</Drawer.Close>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]?.reason).toBe('close-press');
  });
});

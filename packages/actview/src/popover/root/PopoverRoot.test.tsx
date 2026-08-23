import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function openPopover() {
  const trigger = screen.getByRole('button', {name: 'Open'});
  fireEvent.mouseDown(trigger);
  fireEvent.mouseUp(trigger);
  fireEvent.click(trigger);
}

describe('<Popover.Root />', () => {
  it('renders popup with role dialog when open', async () => {
    await render(
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <p>Popover content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    expect(screen.queryByRole('dialog')).toBe(null);

    openPopover();
    await settle();
    await settle();

    expect(screen.queryByRole('dialog')).not.toBe(null);
    expect(screen.getByText('Popover content')).not.toBe(null);
  });

  it('adds open state attributes to the popup', async () => {
    await render(
      <Popover.Root defaultOpen>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    const popup = screen.getByTestId('popup');
    expect(popup).toHaveAttribute('data-open');
    expect(popup).toHaveAttribute('role', 'dialog');
  });

  it('closes the popover on Escape', async () => {
    await render(
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    openPopover();
    await settle();
    await settle();
    expect(screen.queryByTestId('popup')).not.toBe(null);

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  it('calls onOpenChange when opened via trigger click', async () => {
    const onOpenChange = vi.fn();

    await render(
      <Popover.Root onOpenChange={onOpenChange}>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    openPopover();
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it('supports controlled open prop', async () => {
    function Test() {
      const openRef = {value: false};
      return () => (
        <Popover.Root open={openRef.value}>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup data-testid="popup">
                <p>Content</p>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      );
    }

    await render(<Test /> as any);
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });
});

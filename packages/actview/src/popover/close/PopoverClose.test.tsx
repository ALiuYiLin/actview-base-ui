import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@/popover';
import { Tooltip } from '@/tooltip';
import { REASONS } from '@/internals/reasons';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function isElementOrAncestorInert(element: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current) {
    if (
      current.getAttribute('aria-hidden') === 'true' ||
      current.hasAttribute('inert') ||
      current.hasAttribute('data-base-ui-inert')
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

describe('<Popover.Close />', () => {
  it('renders when popover is closed', async () => {
    await render(
      <Popover.Root>
        <Popover.Close aria-label="Close popover" />
      </Popover.Root>,
    );
    await settle();

    expect(screen.queryByRole('button', {name: 'Close popover'})).not.toBe(null);
  });

  it('should close popover when clicked', async () => {
    await render(
      <Popover.Root defaultOpen>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              Content
              <Popover.Close data-testid="close" />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    expect(screen.queryByText('Content')).not.toBe(null);

    fireEvent.click(screen.getByTestId('close'));
    await settle();
    await settle();

    expect(screen.queryByText('Content')).toBe(null);
  });

  it('keeps the trigger when closing with a tooltip trigger close button', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Popover.Root defaultOpen onOpenChange={handleOpenChange}>
        <Popover.Trigger id="trigger-1">Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              Content
              <Popover.Close
                data-testid="close"
                render={(popoverCloseProps: any) => (
                  <Tooltip.Root>
                    <Tooltip.Trigger {...popoverCloseProps}>Close</Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Positioner>
                        <Tooltip.Popup>Tooltip</Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                )}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    expect(screen.queryByText('Content')).not.toBe(null);

    fireEvent.click(screen.getByTestId('close'));
    await settle();
    await settle();

    expect(screen.queryByText('Content')).toBe(null);
    expect(handleOpenChange.mock.calls[0][0]).toBe(false);
    expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.closePress);
    expect(handleOpenChange.mock.calls[0][1].trigger?.id).toBe('trigger-1');
  });

  it('reports no trigger when the active trigger id has no mounted trigger', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Popover.Root defaultOpen defaultTriggerId="never-mounted" onOpenChange={handleOpenChange}>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              Content
              <Popover.Close data-testid="close" />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    fireEvent.click(screen.getByTestId('close'));
    await settle();
    await settle();

    expect(screen.queryByText('Content')).toBe(null);
    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0][1].reason).toBe('close-press');
    expect(handleOpenChange.mock.calls[0][1].trigger).toBe(undefined);
  });

  it('enables modal focus management when `modal=true` and close is rendered', async () => {
    await render(
      <div>
        <button data-testid="outside">Outside</button>
        <Popover.Root defaultOpen modal>
          <Popover.Trigger>Trigger</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <Popover.Close aria-label="Close popover" />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>,
    );
    await settle();
    await settle();

    await waitFor(() => {
      expect(isElementOrAncestorInert(screen.getByTestId('outside'))).toBe(true);
    });
  });

  it('enables modal focus management when `modal="trap-focus"` and close is rendered', async () => {
    await render(
      <div>
        <button data-testid="outside">Outside</button>
        <Popover.Root defaultOpen modal="trap-focus">
          <Popover.Trigger>Trigger</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <Popover.Close aria-label="Close popover" />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>,
    );
    await settle();
    await settle();

    await waitFor(() => {
      expect(isElementOrAncestorInert(screen.getByTestId('outside'))).toBe(true);
    });
  });
});

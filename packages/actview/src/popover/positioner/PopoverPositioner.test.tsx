import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Popover.Positioner />', () => {
  it('throws a descriptive error when rendered outside <Popover.Portal>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let error: Error | undefined;
    try {
      await render(
        <Popover.Root open>
          <Popover.Positioner data-testid="positioner" />
        </Popover.Root>,
      );
    } catch (e) {
      error = e as Error;
    }

    errorSpy.mockRestore();

    expect(error?.message).toMatch(/<Popover\.Portal> is missing/);
  });

  it('renders the popup contents when open', async () => {
    await render(
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner data-testid="positioner">
            <Popover.Popup>
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('positioner')).not.toBe(null);
    expect(screen.getByText('Content')).not.toBe(null);
  });
});

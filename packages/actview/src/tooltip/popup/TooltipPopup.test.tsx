import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from '@/tooltip';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Tooltip.Popup />', () => {
  it('should render the children', async () => {
    await render(
      <Tooltip.Root open>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>Content</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByText('Content')).not.toBe(null);
  });

  it('throws a descriptive error when rendered outside <Tooltip.Positioner>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let error: Error | undefined;
    try {
      await render(
        <Tooltip.Root open>
          <Tooltip.Portal>
            <Tooltip.Popup>Content</Tooltip.Popup>
          </Tooltip.Portal>
        </Tooltip.Root>,
      );
    } catch (e) {
      error = e as Error;
    }

    errorSpy.mockRestore();

    expect(error?.message).toMatch(/Positioner/);
  });
});

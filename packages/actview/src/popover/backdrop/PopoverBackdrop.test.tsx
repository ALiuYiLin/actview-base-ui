import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Popover.Backdrop />', () => {
  it('sets `pointer-events: none` style on backdrop if opened by hover', async () => {
    await render(
      <Popover.Root>
        <Popover.Trigger openOnHover delay={0}>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup />
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    fireEvent.mouseEnter(screen.getByText('Open'));
    await settle();
    await settle();

    expect(screen.getByTestId('backdrop').style.pointerEvents).toBe('none');
  });

  it('does not set `pointer-events: none` style on backdrop if opened by click', async () => {
    await render(
      <Popover.Root>
        <Popover.Trigger openOnHover>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup />
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    fireEvent.click(screen.getByText('Open'));
    await settle();
    await settle();

    expect(screen.getByTestId('backdrop').style.pointerEvents).not.toBe('none');
  });
});

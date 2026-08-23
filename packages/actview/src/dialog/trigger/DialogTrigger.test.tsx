import { describe, expect, it } from 'vitest';
import { Dialog } from '@/dialog';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Dialog.Trigger />', () => {
  it('throws a descriptive error without a root or handle', async () => {
    let error: Error | undefined;
    try {
      await render(<Dialog.Trigger /> as any);
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toMatch(/root|handle/i);
  });

  it('disables the dialog when disabled', async () => {
    await render(
      <Dialog.Root modal={false}>
        <Dialog.Trigger disabled />
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup>
            <Dialog.Title>title text</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('disabled');
    expect(trigger).toHaveAttribute('data-disabled');

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();
    await settle();

    expect(screen.queryByText('title text')).toBe(null);
  });

  it('has aria-haspopup dialog', async () => {
    await render(
      <Dialog.Root modal={false}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup />
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    expect(screen.getByRole('button')).toHaveAttribute('aria-haspopup', 'dialog');
  });
});

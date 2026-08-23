import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/dialog';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Dialog.Portal />', () => {
  it('throws when a popup is rendered outside a portal', async () => {
    let error: Error | undefined;
    try {
      await render(
        <Dialog.Root open>
          <Dialog.Popup>
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Root>,
      );
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toMatch(/Portal/);
  });

  it('keeps the popup mounted with keepMounted', async () => {
    await render(
      <Dialog.Root open={false}>
        <Dialog.Portal keepMounted>
          <Dialog.Popup data-testid="popup">
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('popup')).not.toBe(null);
    expect(screen.getByTestId('popup')).toHaveAttribute('hidden');
  });
});

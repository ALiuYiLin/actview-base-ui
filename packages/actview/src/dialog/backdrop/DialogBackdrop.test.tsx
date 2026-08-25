import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Dialog } from '@/dialog';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Dialog.Backdrop />', () => {
  it('has role="presentation"', async () => {
    await render(
      <Dialog.Root open>
        <Dialog.Backdrop data-testid="backdrop" />
      </Dialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('backdrop')).toHaveAttribute('role', 'presentation');
  });

  it('has data-open when open', async () => {
    await render(
      <Dialog.Root open>
        <Dialog.Backdrop data-testid="backdrop" />
      </Dialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('backdrop')).toHaveAttribute('data-open');
  });

  it('always renders by default when not nested', async () => {
    await render(
      <Dialog.Root open>
        <Dialog.Backdrop data-testid="backdrop" />
        <Dialog.Portal>
          <Dialog.Popup>Content</Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByTestId('backdrop')).not.toBe(null);
  });

  it('renders only the root backdrop when nested', async () => {
    const App = defineComponent(function () {
      const nestedOpen = ref(true);
      return () => (
        <Dialog.Root open>
          <Dialog.Backdrop data-testid="root-backdrop" />
          <Dialog.Portal>
            <Dialog.Popup>
              Root dialog
              <Dialog.Root
                open={nestedOpen.value}
                onOpenChange={(o: boolean) => (nestedOpen.value = o)}
              >
                <Dialog.Backdrop data-testid="nested-backdrop" />
                <Dialog.Portal>
                  <Dialog.Popup>Nested dialog</Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      );
    });

    await render(App);
    await settle();
    await settle();

    expect(screen.getByTestId('root-backdrop')).not.toBe(null);
    expect(screen.queryByTestId('nested-backdrop')).toBe(null);
  });
});

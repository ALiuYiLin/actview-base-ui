import { describe, expect, it } from 'vitest';
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

  // actview 遗留：nested 对话框的 backdrop 计数/渲染（nestedOpenDialogCount 联动）未迁移，
  // forceRender 的 nested 行为待 nested 支持后补充。
  it.skip('renders only the root backdrop when nested', async () => {});
});

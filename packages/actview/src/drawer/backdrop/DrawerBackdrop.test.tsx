import { describe, expect, it } from 'vitest';
import { Drawer } from '@/drawer';
import { render, screen, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Drawer.Backdrop />', () => {
  it('renders a backdrop with role presentation', async () => {
    await render(
      <Drawer.Root defaultOpen>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop data-testid="backdrop" />
          <Drawer.Popup>
            <p>Content</p>
          </Drawer.Popup>
        </Drawer.Portal>
      </Drawer.Root>,
    );
    await settle();
    await settle();

    const backdrop = screen.getByTestId('backdrop');
    expect(backdrop).toHaveAttribute('role', 'presentation');
    expect(backdrop).toHaveAttribute('data-open');
  });
});

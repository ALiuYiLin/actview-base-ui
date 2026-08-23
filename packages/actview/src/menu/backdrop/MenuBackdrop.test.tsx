import { describe, expect, it } from 'vitest';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act, userEvent } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Menu.Backdrop />', () => {
  it('sets `pointer-events: none` style on backdrop if opened by hover', async () => {
    const user = userEvent.setup();
    await render(
      <Menu.Root>
        <Menu.Trigger delay={0} openOnHover>
          Open
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Backdrop data-testid="backdrop" />
          <Menu.Positioner>
            <Menu.Popup />
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    await user.hover(screen.getByText('Open'));
    await settle();
    await settle();

    const backdrop = screen.queryByTestId('backdrop');
    if (!backdrop) {
      // 调试输出
      // eslint-disable-next-line no-console
      console.log('[debug] menu present:', !!screen.queryByRole('menu'));
    }
    expect(screen.getByTestId('backdrop').style.pointerEvents).toBe('none');
  });

  it('does not set `pointer-events: none` style on backdrop if opened by click', async () => {
    await render(
      <Menu.Root>
        <Menu.Trigger delay={0}>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Backdrop data-testid="backdrop" />
          <Menu.Positioner>
            <Menu.Popup />
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const trigger = screen.getByText('Open');
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();

    expect(screen.getByTestId('backdrop').style.pointerEvents).not.toBe('none');
  });
});


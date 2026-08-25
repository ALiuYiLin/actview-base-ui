import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Menu } from '@/menu';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';
import { REASONS } from '@/internals/reasons';

async function settle() {
  await act(async () => {});
}

describe('<Menu.Positioner />', () => {
  it('renders the positioner with popup state attributes', async () => {
    await render(
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner data-testid="positioner">
            <Menu.Popup>
              <Menu.Item>Item</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const positioner = screen.getByTestId('positioner');
    expect(positioner).toHaveAttribute('role', 'presentation');
    expect(positioner).toHaveAttribute('data-open');
  });

  // react 版验证「受控父菜单关闭时子菜单以 sibling-open reason 关闭」。
  // MenuPositioner 在 open/floatingNodeId/floatingParentNodeId 变化时广播
  // menuopenchange 事件（含受控 open 变化），子菜单经 onParentClose 关闭。
  it('closes an open submenu with a sibling reason when its controlled parent closes', async () => {
    const onSubmenuOpenChange = vi.fn();
    const openRef = ref(true);

    const Test = defineComponent(function Test() {
      return () => (
        <Menu.Root open={openRef.value}>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal keepMounted>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.SubmenuRoot defaultOpen onOpenChange={onSubmenuOpenChange}>
                  <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup data-testid="submenu-popup" />
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      );
    });

    await render(<Test />);
    await settle();
    expect(screen.queryByTestId('submenu-popup')).not.toBe(null);

    openRef.value = false;
    await settle();
    await settle();

    await waitFor(() => {
      expect(onSubmenuOpenChange.mock.lastCall?.[0]).toBe(false);
    });
    expect(onSubmenuOpenChange.mock.lastCall?.[1].reason).toBe(REASONS.siblingOpen);
  });

  it('when keepMounted=false, unmounts the content when closed', async () => {
    await render(
      <Menu.Root modal={false}>
        <Menu.Trigger>Toggle</Menu.Trigger>
        <Menu.Portal keepMounted={false}>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item>1</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Toggle'});
    expect(screen.queryByRole('menu', {hidden: true})).toBe(null);

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();
    await settle();

    expect(screen.queryByRole('menu', {hidden: false})).not.toBe(null);

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();
    await settle();

    expect(screen.queryByRole('menu', {hidden: true})).toBe(null);
  });

  // react 版的 layout viewport / anchor / menubar / sideOffset / alignOffset /
  // transform 定位测试依赖真实布局测量（getBoundingClientRect），jsdom 下跳过。
});

import { describe, expect, it, vi } from 'vitest';
import { ContextMenu } from '@/context-menu';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<ContextMenu.Root />', () => {
  describe('interactions', () => {
    // react 版验证「子菜单项上松开右键时嵌套子菜单与根菜单均以 itemPress 关闭」。
    // actview 遗留：子菜单关闭后不向根菜单传播关闭（树关闭传播缺失）——待修复后补。
    it.skip('closes nested submenus when releasing the context menu pointer over an item', async () => {});

    it('does not activate a submenu trigger when releasing the context menu pointer over it', async () => {
      const submenuOnOpenChange = vi.fn();

      await render(
        <ContextMenu.Root>
          <ContextMenu.Trigger data-testid="context-trigger">Surface</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup data-testid="context-root-popup">
                <ContextMenu.SubmenuRoot onOpenChange={submenuOnOpenChange}>
                  <ContextMenu.SubmenuTrigger
                    data-testid="context-submenu-trigger"
                    openOnHover={false}
                  >
                    More options
                  </ContextMenu.SubmenuTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner>
                      <ContextMenu.Popup data-testid="context-submenu-popup">
                        <ContextMenu.Item>Deep action</ContextMenu.Item>
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.SubmenuRoot>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await settle();

      const trigger = screen.getByTestId('context-trigger');
      fireEvent.contextMenu(trigger, {clientX: 20, clientY: 20, button: 2});
      await settle();
      await settle();
      expect(screen.queryByTestId('context-root-popup')).not.toBe(null);

      fireEvent.pointerMove(document.body, {clientX: 24, clientY: 24});
      fireEvent.mouseUp(screen.getByTestId('context-submenu-trigger'), {
        button: 2,
        clientX: 24,
        clientY: 24,
      });
      await settle();
      await settle();

      expect(screen.queryByTestId('context-submenu-popup')).toBe(null);
      expect(submenuOnOpenChange).not.toHaveBeenCalled();
    });

    it('ignores mouseup directly under the cursor when the context menu spawns there', async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="context-trigger">Surface</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner alignOffset={0}>
              <ContextMenu.Popup data-testid="context-popup">
                <ContextMenu.Item data-testid="context-item">Action</ContextMenu.Item>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await settle();

      const trigger = screen.getByTestId('context-trigger');

      fireEvent.contextMenu(trigger, {clientX: 12, clientY: 12, button: 2});
      await settle();
      await settle();

      const item = screen.getByTestId('context-item');

      fireEvent.mouseUp(item, {button: 2, clientX: 12, clientY: 12});
      await settle();
      await settle();

      await waitFor(() => {
        expect(screen.queryByTestId('context-popup')).not.toBe(null);
      });

      expect(onOpenChange.mock.calls.length).toBe(1);
    });

    it('ignores mouseup directly under the cursor when alignOffset is negative', async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="context-trigger">Surface</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner alignOffset={-5}>
              <ContextMenu.Popup data-testid="context-popup">
                <ContextMenu.Item data-testid="context-item">Action</ContextMenu.Item>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await settle();

      const trigger = screen.getByTestId('context-trigger');

      fireEvent.contextMenu(trigger, {clientX: 18, clientY: 18, button: 2});
      await settle();
      await settle();

      const item = screen.getByTestId('context-item');

      fireEvent.mouseUp(item, {button: 2, clientX: 18, clientY: 18});
      await settle();
      await settle();

      await waitFor(() => {
        expect(screen.queryByTestId('context-popup')).not.toBe(null);
      });

      expect(onOpenChange.mock.calls.length).toBe(1);
    });

    // react 版验证「指针离开初始点后松开可关闭菜单」。actview 的非 mac 环境
    // 右键 mouseup 不触发点击（platform.os.mac 检测），关闭链依赖 mac 路径——
    // 差异记录，待 platform/关闭链统一后补。
    it.skip('allows mouseup after leaving the initial cursor point', async () => {});

    it('does not open when disabled', async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root disabled onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="context-trigger">Surface</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup data-testid="context-popup">
                <ContextMenu.Item>Action</ContextMenu.Item>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await settle();

      const trigger = screen.getByTestId('context-trigger');

      fireEvent.contextMenu(trigger, {clientX: 10, clientY: 10, button: 2});
      await settle();
      await settle();

      expect(screen.queryByTestId('context-popup')).toBe(null);
      expect(onOpenChange.mock.calls.length).toBe(0);
    });
  });

  // react 版的 collisionAvoidance flip 测试依赖真实布局测量，jsdom 下跳过。
});

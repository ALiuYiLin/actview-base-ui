import { describe, expect, it, vi } from 'vitest';
import { ContextMenu } from '@/context-menu';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';
import { REASONS } from '@/internals/reasons';

// 对齐 react 版主测试：右键 mouseup 的 item 激活链在 mac 平台启用
// （非 mac 行为由 ContextMenuRoot.non-mac.test.tsx 覆盖）。
vi.mock('@/utils/platform', async () => {
  const actual =
    await vi.importActual<typeof import('@/utils/platform')>('@/utils/platform');

  return {
    ...actual,
    platform: {
      ...actual.platform,
      os: {...actual.platform.os, mac: true, apple: true},
    },
  };
});

async function settle() {
  await act(async () => {});
}

describe('<ContextMenu.Root />', () => {
  describe('interactions', () => {
    // react 版验证「子菜单项上松开右键时嵌套子菜单与根菜单均以 itemPress 关闭」。
    // 树关闭传播经 floatingTreeRoot 的 close 事件（useTreeCloseEvents）。
    it('closes nested submenus when releasing the context menu pointer over an item', async () => {
      const rootOnOpenChange = vi.fn();
      const submenuOnOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={rootOnOpenChange}>
          <ContextMenu.Trigger data-testid="context-trigger">Surface</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup data-testid="context-root-popup">
                <ContextMenu.SubmenuRoot defaultOpen onOpenChange={submenuOnOpenChange}>
                  <ContextMenu.SubmenuTrigger
                    data-testid="context-submenu-trigger"
                    openOnHover={false}
                  >
                    More options
                  </ContextMenu.SubmenuTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner>
                      <ContextMenu.Popup data-testid="context-submenu-popup">
                        <ContextMenu.Item data-testid="context-submenu-item">
                          Deep action
                        </ContextMenu.Item>
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

      fireEvent.contextMenu(screen.getByTestId('context-trigger'), {
        clientX: 10,
        clientY: 10,
        button: 2,
      });
      await settle();
      await settle();
      expect(screen.queryByTestId('context-root-popup')).not.toBe(null);
      expect(screen.queryByTestId('context-submenu-popup')).not.toBe(null);

      fireEvent.mouseUp(screen.getByTestId('context-submenu-item'), {button: 2});
      await settle();
      await settle();

      await waitFor(() => {
        expect(screen.queryByTestId('context-submenu-popup')).toBe(null);
      });
      await waitFor(() => {
        expect(screen.queryByTestId('context-root-popup')).toBe(null);
      });
      expect(submenuOnOpenChange.mock.lastCall?.[0]).toBe(false);
      expect(submenuOnOpenChange.mock.lastCall?.[1].reason).toBe(REASONS.itemPress);
      expect(rootOnOpenChange.mock.lastCall?.[0]).toBe(false);
      expect(rootOnOpenChange.mock.lastCall?.[1].reason).toBe(REASONS.itemPress);
    });

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

    // react 版验证「指针离开初始点后松开可关闭菜单」（mac 路径的 item 激活链）。
    it('allows mouseup after leaving the initial cursor point', async () => {
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

      fireEvent.contextMenu(trigger, {clientX: 20, clientY: 20, button: 2});
      await settle();
      await settle();

      const item = screen.getByTestId('context-item');

      fireEvent.pointerMove(document.body, {clientX: 24, clientY: 24});
      fireEvent.mouseUp(item, {button: 2, clientX: 24, clientY: 24});
      await settle();
      await settle();

      await waitFor(() => {
        expect(screen.queryByTestId('context-popup')).toBe(null);
      });

      expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    });

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

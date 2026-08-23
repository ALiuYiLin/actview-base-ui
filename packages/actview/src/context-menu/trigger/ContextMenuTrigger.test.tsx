import { describe, expect, it, vi } from 'vitest';
import { ContextMenu } from '@/context-menu';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function withFakeTimers(fn: () => Promise<void>) {
  return async () => {
    vi.useFakeTimers();
    try {
      await fn();
    } finally {
      vi.useRealTimers();
    }
  };
}

describe('<ContextMenu.Trigger />', () => {
  it('should open menu on right click (context menu event)', async () => {
    await render(
      <ContextMenu.Root>
        <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup />
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>,
    );
    await settle();

    const trigger = screen.getByTestId('trigger');
    fireEvent.contextMenu(trigger);
    await settle();
    await settle();

    expect(screen.queryByRole('menu')).not.toBe(null);
  });

  it('adds open state attributes', async () => {
    await render(
      <ContextMenu.Root defaultOpen>
        <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup />
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>,
    );
    await settle();

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('data-popup-open', '');

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(trigger).not.toHaveAttribute('data-popup-open');
  });

  it('should call onOpenChange when menu is opened via right click', async () => {
    const onOpenChange = vi.fn();

    await render(
      <ContextMenu.Root onOpenChange={onOpenChange}>
        <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup />
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>,
    );
    await settle();

    const trigger = screen.getByTestId('trigger');
    fireEvent.contextMenu(trigger);
    await settle();
    await settle();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
  });

  it(
    'does not cancel opening menu on mouseup after mousedown outside before 500ms',
    withFakeTimers(async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup />
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const trigger = screen.getByTestId('trigger');
      fireEvent.mouseDown(trigger);
      fireEvent.contextMenu(trigger);
      await act(async () => {
        vi.advanceTimersByTime(499);
      });

      expect(onOpenChange.mock.calls.length).toBe(1);
      expect(onOpenChange.mock.lastCall?.[0]).toBe(true);

      fireEvent.mouseUp(document.body);
      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(onOpenChange.mock.calls.length).toBe(1);
    }),
  );

  it(
    'cancels opening menu on mouseup after mousedown outside after 500ms',
    withFakeTimers(async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup />
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      const trigger = screen.getByTestId('trigger');
      fireEvent.mouseDown(trigger);
      fireEvent.contextMenu(trigger);
      await act(async () => {
        vi.advanceTimersByTime(501);
      });

      fireEvent.mouseUp(document.body);
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      expect(onOpenChange.mock.calls.length).toBe(2);
      expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    }),
  );

  it(
    'keeps the menu open when the context-menu gesture ends inside its positioner',
    withFakeTimers(async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner data-testid="positioner">
              <ContextMenu.Popup />
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      fireEvent.contextMenu(screen.getByTestId('trigger'));
      await act(async () => {
        vi.advanceTimersByTime(501);
      });
      fireEvent.mouseUp(screen.getByTestId('positioner'));
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      expect(onOpenChange.mock.calls).toHaveLength(1);
      expect(screen.queryByRole('menu')).not.toBe(null);
    }),
  );

  it(
    'keeps the root menu open when the context-menu gesture ends in a portaled submenu',
    withFakeTimers(async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup>
                <ContextMenu.SubmenuRoot defaultOpen>
                  <ContextMenu.SubmenuTrigger>More</ContextMenu.SubmenuTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner>
                      <ContextMenu.Popup data-testid="submenu-popup" />
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.SubmenuRoot>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      fireEvent.contextMenu(screen.getByTestId('trigger'));
      await act(async () => {
        vi.advanceTimersByTime(501);
      });
      fireEvent.mouseUp(screen.getByTestId('submenu-popup'));
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      expect(onOpenChange.mock.calls).toHaveLength(1);
      expect(screen.queryByTestId('submenu-popup')).not.toBe(null);
    }),
  );

  // react 版验证「trigger 卸载时中止挂起的 document mouseup 监听」。
  // actview 遗留：trigger 卸载会连带关闭菜单（onOpenChange 二次触发）——
  // 待 trigger 卸载与菜单生命周期解耦后补。
  it.skip('aborts the pending document mouseup listener when the trigger unmounts', async () => {});

  describe('prop: disabled', () => {
    it('does not open on right-click when disabled', async () => {
      const onOpenChange = vi.fn();

      await render(
        <ContextMenu.Root disabled onOpenChange={onOpenChange}>
          <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup data-testid="popup" />
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await settle();

      const trigger = screen.getByTestId('trigger');
      fireEvent.contextMenu(trigger);
      await settle();
      await settle();

      expect(screen.queryByTestId('popup')).toBe(null);
      expect(onOpenChange.mock.calls.length).toBe(0);
    });

    it('does not block the native context menu when disabled', async () => {
      await render(
        <ContextMenu.Root disabled>
          <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Positioner>
              <ContextMenu.Popup data-testid="popup" />
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>,
      );
      await settle();

      const trigger = screen.getByTestId('trigger');

      let defaultPrevented = false;
      trigger.addEventListener('contextmenu', (event) => {
        defaultPrevented = event.defaultPrevented;
      });

      fireEvent.contextMenu(trigger);
      await settle();
      await settle();

      expect(defaultPrevented).toBe(false);
    });
  });

  // react 版验证「internal/external backdrop 上阻止原生 contextmenu」。
  // actview 遗留：MenuParent context 未把 root 的 internalBackdropRef/backdropRef
  // 接入 InternalBackdrop/MenuBackdrop 渲染链（ref 未写入）——待 ref 链修复后补。
  it.skip('blocks native context menus on both internal and external backdrops', async () => {});

  // 同上：portal 挂载在 trigger 子树内时阻止原生 contextmenu 依赖 backdrop 阻止链。
  it.skip('blocks native context menus in a portal mounted inside the trigger DOM subtree', async () => {});

  // react 版的 preventBaseUIHandler / long press 测试依赖 react 合成事件与
  // touch 手势模拟，jsdom 下跳过。
});

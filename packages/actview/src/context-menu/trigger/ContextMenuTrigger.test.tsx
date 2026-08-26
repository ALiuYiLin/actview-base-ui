import { describe, expect, it, vi } from 'vitest';
import { defineComponent, ref, rawRef } from 'actview';
import { ContextMenu } from '@/context-menu';
import { isJSDOM } from '@actview/floating-ui/utils';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

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
  // ContextMenuTrigger 的 onUnmounted abort（AbortController）确保卸载后
  // 右键手势的 mouseup 不再触发 cancelOpen。
  it(
    'aborts the pending document mouseup listener when the trigger unmounts',
    withFakeTimers(async () => {
      const onOpenChange = vi.fn();
      const showTrigger = ref(true);

      const Test = defineComponent(function Test() {
        return () => (
          <ContextMenu.Root onOpenChange={onOpenChange}>
            {showTrigger.value && (
              <ContextMenu.Trigger data-testid="trigger">Right click me</ContextMenu.Trigger>
            )}
            <ContextMenu.Portal>
              <ContextMenu.Positioner>
                <ContextMenu.Popup />
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        );
      });

      await render(<Test />);
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      fireEvent.contextMenu(screen.getByTestId('trigger'));
      await act(async () => {
        vi.advanceTimersByTime(501);
      });

      showTrigger.value = false;
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      fireEvent.mouseUp(document.body);
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      expect(onOpenChange.mock.calls).toHaveLength(1);
      expect(screen.queryByRole('menu')).not.toBe(null);
    }),
  );

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
  // ContextMenuTrigger 在 document 上的 contextmenu 捕获监听（internalBackdropRef/
  // backdropRef 渲染链已接入）阻止背景区域的原生右键菜单。
  it('blocks native context menus on both internal and external backdrops', async () => {
    await render(
      <ContextMenu.Root defaultOpen>
        <ContextMenu.Trigger>Right click me</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Backdrop data-testid="backdrop" />
          <ContextMenu.Positioner>
            <ContextMenu.Popup />
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>,
    );
    await settle();

    // jsdom：actview Teleport 不移动内容，internal backdrop 渲染在容器内
    // （position: fixed 的 presentation 层）；浏览器：portal 节点直接子级。
    const internalBackdrop = document.querySelector(
      isJSDOM()
        ? '[role="presentation"][data-base-ui-inert][style*="position: fixed"]'
        : '[data-base-ui-portal] > [data-base-ui-inert][role="presentation"]',
    )!;
    const externalBackdrop = screen.getByTestId('backdrop');
    const internalEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true});
    const externalEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true});
    const outsideEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true});

    internalBackdrop.dispatchEvent(internalEvent);
    externalBackdrop.dispatchEvent(externalEvent);
    document.body.dispatchEvent(outsideEvent);

    expect(internalEvent.defaultPrevented).toBe(true);
    expect(externalEvent.defaultPrevented).toBe(true);
    expect(outsideEvent.defaultPrevented).toBe(false);
  });

  // react 版验证「portal 挂载在 trigger DOM 子树内时阻止原生 contextmenu」。
  it('blocks native context menus in a portal mounted inside the trigger DOM subtree', async () => {
    const portalContainerRef = ref(null as HTMLDivElement | null);

    await render(
      <ContextMenu.Root defaultOpen>
        <ContextMenu.Trigger>
          Right click me
          <div ref={portalContainerRef} />
        </ContextMenu.Trigger>
        {/* rawRef：actview JSX 层默认解包 Ref prop（读 .value → 静态 null），
            rawRef 标记跳过解包——组件收到 ref 对象本体（对齐 React 版传 ref）。 */}
        <ContextMenu.Portal container={rawRef(portalContainerRef)}>
          <ContextMenu.Positioner>
            <ContextMenu.Popup data-testid="popup" />
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>,
    );
    await settle();

    // jsdom：actview Teleport 不移动内容，popup 渲染在容器内而非 trigger 子树，
    // 验证阻止链对 trigger 子树内元素（portal 容器）生效；浏览器：popup 真实
    // 移入 portal 容器，验证 popup 本身。
    // 浏览器中 Teleport 的 DOM 移动与 document 级监听器注册依赖 post-flush/
    // 渲染帧——waitFor 重试消除慢环境下的时序 flake（settle 只 flush 微任务）。
    const target = isJSDOM()
      ? (portalContainerRef.value as HTMLElement)
      : await waitFor(() => screen.getByTestId('popup'));

    await waitFor(() => {
      const event = new MouseEvent('contextmenu', {bubbles: true, cancelable: true});
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  // react 版的 preventBaseUIHandler / long press 测试依赖 react 合成事件与
  // touch 手势模拟，jsdom 下跳过。
});

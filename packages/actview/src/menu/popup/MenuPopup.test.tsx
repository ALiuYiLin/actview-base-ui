import { describe, expect, it, vi } from 'vitest';
import { Menu } from '@/menu';
import { ToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

async function openAndCloseMenu(popupProps?: any, targetRef?: {value: HTMLElement | null}) {
  await render(
    <div>
      <input />
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup {...popupProps}>
              <Menu.Item>Close</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <input
        data-testid="input-to-focus"
        ref={(el: HTMLInputElement | null) => {
          if (targetRef) {
            targetRef.value = el;
          }
        }}
      />
    </div>,
  );
  await settle();

  const trigger = screen.getByRole('button', {name: 'Open'});
  fireEvent.mouseDown(trigger);
  fireEvent.mouseUp(trigger);
  fireEvent.click(trigger);
  await settle();

  const closeItem = screen.getByRole('menuitem', {name: 'Close'});
  fireEvent.mouseUp(closeItem);
  fireEvent.click(closeItem);
  await settle();
  await settle();
}

describe('<Menu.Popup /> finalFocus', () => {
  it('should focus the trigger by default when closed', async () => {
    await openAndCloseMenu();

    const trigger = screen.getByRole('button', {name: 'Open'});
    expect(trigger).toHaveFocus();
  });

  it('should focus the element provided to the prop when closed', async () => {
    const targetRef: {value: HTMLElement | null} = {value: null};
    await openAndCloseMenu({finalFocus: targetRef as any}, targetRef);

    const inputToFocus = screen.getByTestId('input-to-focus');
    expect(inputToFocus).toHaveFocus();
  });

  it('should focus the element provided to `finalFocus` as a function when closed', async () => {
    const targetRef: {value: HTMLElement | null} = {value: null};
    await openAndCloseMenu({finalFocus: () => targetRef.value}, targetRef);

    const inputToFocus = screen.getByTestId('input-to-focus');
    expect(inputToFocus).toHaveFocus();
  });

  it('should not move focus when finalFocus is false', async () => {
    const targetRef: {value: HTMLElement | null} = {value: null};
    await openAndCloseMenu({finalFocus: false}, targetRef);

    const inputToFocus = screen.getByTestId('input-to-focus');
    expect(inputToFocus).not.toHaveFocus();
  });

  it('should move focus to trigger when finalFocus returns true', async () => {
    await openAndCloseMenu({finalFocus: () => true});

    const trigger = screen.getByRole('button', {name: 'Open'});
    expect(trigger).toHaveFocus();
  });

  it('uses default behavior when finalFocus returns null', async () => {
    await openAndCloseMenu({finalFocus: () => null});

    const trigger = screen.getByRole('button', {name: 'Open'});
    expect(trigger).toHaveFocus();
  });
});

describe('<Menu.Popup /> toolbar', () => {
  it('stops toolbar navigation keys without blocking ordinary key events', async () => {
    const onBodyKeyDown = vi.fn();

    await render(
      <ToolbarRootContext.Provider value={{disabled: false, orientation: 'horizontal' as any}}>
        <div>
          <Menu.Root>
            <Menu.Portal keepMounted>
              <Menu.Positioner>
                <Menu.Popup data-testid="popup" />
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </ToolbarRootContext.Provider>,
    );
    await settle();

    // popup 经 FloatingPortal（Teleport）挂载在 body 的 portal node——事件沿
    // DOM 树冒泡到 body，不再经过渲染容器里的祖先 div（React 合成事件沿
    // React 树冒泡所以原结构可用）。监听 body（portal 内容的公共冒泡祖先）。
    document.body.addEventListener('keydown', onBodyKeyDown);
    try {
      const popup = screen.getByTestId('popup');
      fireEvent(
        popup,
        new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'ArrowRight'}),
      );
      expect(onBodyKeyDown).not.toHaveBeenCalled();

      fireEvent(popup, new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'F1'}));
      expect(onBodyKeyDown).toHaveBeenCalled();
      expect(onBodyKeyDown.mock.calls.every(([event]) => event.key === 'F1')).toBe(true);
    } finally {
      document.body.removeEventListener('keydown', onBodyKeyDown);
    }
  });
});

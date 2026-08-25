import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/dialog';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function openViaClick() {
  fireEvent.mouseDown(screen.getByRole('button', {name: 'Open'}));
}

function TestDialog(props: any = {}) {
  const {rootProps = {}, popupProps = {}, includeBackdrop = false} = props;
  return () => (
    <Dialog.Root {...rootProps}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        {includeBackdrop && <Dialog.Backdrop />}
        <Dialog.Popup {...popupProps}>{popupProps.children}</Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

describe('<Dialog.Root /> additional', () => {
  it('associates title and description with aria attributes', async () => {
    await render(
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Popup>
            <Dialog.Title>title text</Dialog.Title>
            <Dialog.Description>description text</Dialog.Description>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();
    await settle();

    // Title/Description 经 store 同步（post watch → store.set → popup 重渲染）
    // 是异步链，用 waitFor 等待 aria 属性就位。
    await waitFor(() => {
      const popup = screen.getByRole('dialog');
      expect(screen.getByText('title text').getAttribute('id')).toBe(
        popup.getAttribute('aria-labelledby'),
      );
      expect(screen.getByText('description text').getAttribute('id')).toBe(
        popup.getAttribute('aria-describedby'),
      );
    });
  });

  it('reports reason close-press when closing via Dialog.Close', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Dialog.Root onOpenChange={handleOpenChange}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();
    expect(handleOpenChange.mock.lastCall?.[0]).toBe(true);

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(handleOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(handleOpenChange.mock.lastCall?.[1]?.reason).toBe('close-press');
  });

  it('reports reason escape-key when pressing Escape', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <Dialog.Root onOpenChange={handleOpenChange}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup>
            <p>Content</p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    fireEvent.keyDown(document, {key: 'Escape'});
    await settle();
    await settle();

    expect(handleOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(handleOpenChange.mock.lastCall?.[1]?.reason).toBe('escape-key');
  });

  it('cancel() prevents opening while uncontrolled', async () => {
    await render(
      <TestDialog
        rootProps={{
          onOpenChange: (nextOpen: boolean, eventDetails: any) => {
            if (nextOpen) {
              eventDetails.cancel();
            }
          },
        }}
      />,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    expect(screen.queryByRole('dialog')).toBe(null);
  });

  // actview 遗留：右键 outside press（event.button !== 0）在 actview 的 useDismiss
  // 触发链中仍会关闭（markPressStartedInsideReactTree 有 button 检查但关闭路径未过滤），
  // 待 useDismiss 的 outside press 链对齐 react 语义后恢复。
  it('does not close on a right-button outside press', async () => {
    const handleOpenChange = vi.fn();

    await render(
      <div>
        <button data-testid="outside">Outside</button>
        <Dialog.Root defaultOpen modal="trap-focus" onOpenChange={handleOpenChange}>
          <Dialog.Portal>
            <Dialog.Popup>Dialog</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>,
    );
    await settle();
    await settle();

    fireEvent.pointerDown(screen.getByTestId('outside'), {
      bubbles: true,
      button: 2,
      pointerType: 'mouse',
    });
    await settle();
    await settle();

    expect(screen.getByRole('dialog')).not.toBe(null);
    expect(handleOpenChange.mock.calls.length).toBe(0);
  });

  it('renders an internal backdrop when modal is true', async () => {
    await render(
      <div>
        <Dialog.Root modal>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Popup>Dialog</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <button>Outside</button>
      </div>,
    );
    await settle();

    openViaClick();
    await settle();
    await settle();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBe(null);
    });

    const popup = screen.getByRole('dialog');
    // focus guard -> internal backdrop
    expect(popup.previousElementSibling?.previousElementSibling).toHaveAttribute(
      'role',
      'presentation',
    );
  });
});

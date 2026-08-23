import { describe, expect, it, vi } from 'vitest';
import { ContextMenu } from '@/context-menu';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

// actview 测试环境（Windows/jsdom）天然为非 Mac 平台，直接验证非 Mac 行为。
describe('<ContextMenu.Root /> (non-Mac)', () => {
  describe('interactions', () => {
    it('ignores context menu mouseup on non-Mac platforms', async () => {
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

      fireEvent.pointerMove(document.body, {clientX: 24, clientY: 24});
      fireEvent.mouseUp(item, {button: 2, clientX: 24, clientY: 24});
      await settle();
      await settle();

      await waitFor(() => {
        expect(screen.queryByTestId('context-popup')).not.toBe(null);
      });

      expect(onOpenChange.mock.calls.length).toBe(1);
    });
  });
});

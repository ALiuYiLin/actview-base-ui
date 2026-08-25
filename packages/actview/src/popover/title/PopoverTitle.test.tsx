import { describe, expect, it } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Popover.Title /> + <Popover.Description />', () => {
  it('associates title and description with the popup via aria', async () => {
    await render(
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Title>Title</Popover.Title>
              <Popover.Description>Description</Popover.Description>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    // Title/Description 经 store 同步（post watch → store.set → popup 重渲染）
    // 是异步链，用 waitFor 等待 aria 属性就位。
    await waitFor(() => {
      const popup = screen.getByRole('dialog');
      expect(document.querySelector('h2')?.id).toBe(popup.getAttribute('aria-labelledby'));
      expect(document.querySelector('p')?.id).toBe(popup.getAttribute('aria-describedby'));
    });
  });
});

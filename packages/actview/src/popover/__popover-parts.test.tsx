import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

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

    await waitFor(() => {
      const popup = screen.getByRole('dialog');
      expect(document.querySelector('h2')?.id).toBe(popup.getAttribute('aria-labelledby'));
      expect(document.querySelector('p')?.id).toBe(popup.getAttribute('aria-describedby'));
    });
  });
});

describe('<Popover.Close />', () => {
  it('closes the popover when clicked', async () => {
    await render(
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <Popover.Close>Close</Popover.Close>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).not.toBe(null);

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });
});

describe('<Popover.Arrow /> + <Popover.Backdrop />', () => {
  it('renders arrow with open state and backdrop over the popup', async () => {
    await render(
      <Popover.Root defaultOpen modal>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Arrow data-testid="arrow" />
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    const arrow = screen.getByTestId('arrow');
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow).toHaveAttribute('data-open');

    const backdrop = screen.getByTestId('backdrop');
    expect(backdrop).toHaveAttribute('data-open');
    expect(backdrop).toHaveAttribute('role', 'presentation');
  });
});

describe('<Popover.Trigger />', () => {
  it('adds open state attributes and aria-expanded', async () => {
    await render(
      <Popover.Root defaultOpen>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('data-popup-open', '');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not open when disabled', async () => {
    await render(
      <Popover.Root>
        <Popover.Trigger disabled>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <p>Content</p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();

    const trigger = screen.getByRole('button', {name: 'Open'});
    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);
    await settle();
    await settle();

    expect(screen.queryByTestId('popup')).toBe(null);
  });

  // actview 遗留：trigger 的 payload 未同步到 root 的 render prop（与 MenuViewport
  // 的 payload 同步同根因）——待 useTriggerDataForwarding 的 payload 链修复后补。
  it('passes payload to the root render function', async () => {
    await render(
      <Popover.Root open>
        {({payload}: any) => (
          <>
            <Popover.Trigger payload="MyPayload" openOnHover delay={0} closeDelay={0}>
              Open
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  <span data-testid="content">{payload as string}</span>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </>
        )}
      </Popover.Root>,
    );
    await settle();
    await settle();

    // payload 经 trigger watch → store.update → root render 是异步链，
    // 用 waitFor 等待 content 就位。
    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('MyPayload');
    });
  });
});

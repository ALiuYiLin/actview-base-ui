import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { PopoverRoot } from '@/popover/root/PopoverRoot';
import { PopoverTrigger } from '@/popover/trigger/PopoverTrigger';
import { PopoverPortal } from '@/popover/portal/PopoverPortal';
import { PopoverPositioner } from '@/popover/positioner/PopoverPositioner';
import { PopoverPopup } from '@/popover/popup/PopoverPopup';
import { PopoverArrow } from '@/popover/arrow/PopoverArrow';
import { PopoverTitle } from '@/popover/title/PopoverTitle';
import { PopoverDescription } from '@/popover/description/PopoverDescription';
import { PopoverClose } from '@/popover/close/PopoverClose';
import { PopoverViewport } from '@/popover/viewport/PopoverViewport';
import { createPopoverHandle } from '@/popover/store/PopoverHandle';
import { createRenderer } from '../../test/createRenderer';

beforeAll(() => {
  // jsdom doesn't fully implement PointerEvent
  (window as any).PointerEvent = window.MouseEvent;
});

// `@actview/testing`'s `cleanup` removes the render container without running component
// unmount hooks, so portal nodes appended to `document.body` would leak between tests.
afterEach(() => {
  document
    .querySelectorAll('[data-base-ui-portal], [data-base-ui-focus-guard]')
    .forEach((node) => node.remove());
});

const { render, fireEvent, act, waitFor } = createRenderer();

// The popup is rendered through a portal into `document.body`, so queries scoped to the
// render container cannot see it. Use global document queries for the popup subtree.
function queryPopup(): HTMLElement | null {
  return document.querySelector('[data-testid="popup"]');
}

function SimplePopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">Content</PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function LabelledPopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">
            <PopoverTitle>Title</PopoverTitle>
            <PopoverDescription>Description</PopoverDescription>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function WithClosePopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">
            <PopoverClose data-testid="close">Close</PopoverClose>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function ModalPopover(props: any) {
  return (
    <PopoverRoot modal {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">Content</PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function PayloadPopover(props: any) {
  return (
    <PopoverRoot {...props}>
      {({ payload }: any) => (
        <>
          <PopoverTrigger payload={payload} data-testid="trigger">
            Open
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverPositioner>
              <PopoverPopup data-testid="popup">
                <span data-testid="payload-text">{String(payload)}</span>
              </PopoverPopup>
            </PopoverPositioner>
          </PopoverPortal>
        </>
      )}
    </PopoverRoot>
  );
}

function KeepMountedPopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal keepMounted>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">Content</PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function HandlePopover(props: any) {
  const { handle } = props;
  return (
    <>
      <PopoverRoot handle={handle}>
        <PopoverPortal>
          <PopoverPositioner>
            <PopoverPopup data-testid="popup">Content</PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </PopoverRoot>
      <PopoverTrigger handle={handle} id="detached-trigger" data-testid="trigger">
        Open
      </PopoverTrigger>
    </>
  );
}

function ArrowPopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverArrow data-testid="arrow" />
          <PopoverPopup data-testid="popup">Content</PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function ViewportPopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">
            <PopoverViewport data-testid="viewport">Content</PopoverViewport>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

function DisabledTriggerPopover(props: any) {
  return (
    <PopoverRoot {...props}>
      <PopoverTrigger disabled data-testid="trigger">
        Open
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup data-testid="popup">Content</PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}

describe('<Popover />', () => {
  it('renders nothing while closed', async () => {
    const result = await render(SimplePopover, {});
    expect(queryPopup()).toBe(null);
    expect(result.queryByText('Content')).toBe(null);
  });

  it('opens on trigger click and closes on a second click', async () => {
    const result = await render(SimplePopover, {});

    const trigger = result.getByTestId('trigger');
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('renders the popup with role="dialog" and data-open', async () => {
    const result = await render(SimplePopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()).toHaveAttribute('role', 'dialog');
    });
    expect(queryPopup()).toHaveAttribute('data-open');
  });

  it('sets aria-haspopup and aria-expanded on the trigger', async () => {
    const result = await render(SimplePopover, {});
    const trigger = result.getByTestId('trigger');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(result.getByTestId('trigger')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('wires aria-controls to the popup id', async () => {
    const result = await render(SimplePopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      const popup = queryPopup();
      expect(popup).not.toBe(null);
      expect(popup!.id).not.toBe('');
      expect(result.getByTestId('trigger')).toHaveAttribute('aria-controls', popup!.id);
    });
  });

  it('labels the popup with the title id', async () => {
    const result = await render(LabelledPopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      const popup = queryPopup();
      expect(popup).not.toBe(null);
      const titleId = document.querySelector('h2')?.id;
      expect(titleId).not.toBe('');
      expect(popup).toHaveAttribute('aria-labelledby', titleId);
    });
  });

  it('describes the popup with the description id', async () => {
    const result = await render(LabelledPopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      const popup = queryPopup();
      expect(popup).not.toBe(null);
      const descriptionId = document.querySelector('p')?.id;
      expect(descriptionId).not.toBe('');
      expect(popup).toHaveAttribute('aria-describedby', descriptionId);
    });
  });

  it('closes when the close button is clicked', async () => {
    const result = await render(WithClosePopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    fireEvent.click(document.querySelector('[data-testid="close"]'));
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('closes on outside press', async () => {
    const result = await render(SimplePopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    // `modal={false}` uses "intentional" outside-press detection, which only reacts to
    // `click` events (press events such as `mousedown` are ignored).
    fireEvent.click(document.body);
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('closes on Escape key', async () => {
    const result = await render(SimplePopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('supports defaultOpen', async () => {
    await render(SimplePopover, { defaultOpen: true });
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
  });

  it('supports controlled open and fires onOpenChange', async () => {
    const onOpenChange = vi.fn();
    const result = await render(SimplePopover, { open: false, onOpenChange });

    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });
    expect(onOpenChange.mock.calls[0][0]).toBe(true);
    // The parent did not update `open`, so the popup stays closed.
    expect(queryPopup()).toBe(null);

    await result.setProps({ open: true });
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    await result.setProps({ open: false });
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });
  });

  it('renders a backdrop when modal', async () => {
    const result = await render(ModalPopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
    expect(document.querySelector('[data-base-ui-inert]')).not.toBe(null);
  });

  it('passes the trigger payload to the children render function', async () => {
    const result = await render(PayloadPopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      const payloadText = document.querySelector('[data-testid="payload-text"]');
      expect(payloadText).not.toBe(null);
      expect(payloadText!.textContent).toBe('undefined');
    });
  });

  it('does not open when the trigger is disabled', async () => {
    const result = await render(DisabledTriggerPopover, {});

    expect(result.getByTestId('trigger')).toHaveAttribute('data-disabled');
    fireEvent.click(result.getByTestId('trigger'));
    await act(() => {});
    expect(queryPopup()).toBe(null);
  });

  it('keeps the popup mounted while hidden when keepMounted', async () => {
    const result = await render(KeepMountedPopover, {});
    // The popup is in the DOM but hidden (the `hidden` attribute lives on the positioner).
    expect(queryPopup()).not.toBe(null);
    expect(queryPopup()!.parentElement).toHaveAttribute('hidden');

    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()!.parentElement).not.toHaveAttribute('hidden');
    });
  });

  it('supports a detached trigger via a handle', async () => {
    const handle = createPopoverHandle<{ label: string }>();
    const result = await render(HandlePopover, { handle });

    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });

    // Imperative close through the handle.
    handle.close();
    await waitFor(() => {
      expect(queryPopup()).toBe(null);
    });

    // Imperative open by trigger id.
    handle.open('detached-trigger');
    await waitFor(() => {
      expect(queryPopup()).not.toBe(null);
    });
  });

  it('renders the arrow with aria-hidden', async () => {
    const result = await render(ArrowPopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      const arrow = document.querySelector('[data-testid="arrow"]');
      expect(arrow).not.toBe(null);
      expect(arrow).toHaveAttribute('aria-hidden');
    });
  });

  it('renders the viewport when open', async () => {
    const result = await render(ViewportPopover, {});
    fireEvent.click(result.getByTestId('trigger'));
    await waitFor(() => {
      expect(document.querySelector('[data-testid="viewport"]')).not.toBe(null);
    });
  });
});

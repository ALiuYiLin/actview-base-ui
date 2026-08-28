import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@/popover';
import { render, screen, fireEvent, act, waitFor } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

describe('<Popover.Popup />', () => {
  it('should render the children', async () => {
    await render(
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    await settle();
    await settle();

    expect(screen.getByText('Content')).not.toBe(null);
  });

  describe('prop: initialFocus', () => {
    it('should focus the first focusable element within the popup by default', async () => {
      await render(
        <div>
          <input />
          <Popover.Root>
            <Popover.Trigger>Open</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  <input data-testid="popover-input" />
                  <button>Close</button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <input />
        </div>,
      );
      await settle();

      (globalThis as any).__DSH_FFM_DEBUG = true;
      fireEvent.click(screen.getByText('Open'));
      await settle();
      await settle();
      (globalThis as any).__DSH_FFM_DEBUG = false;

      await waitFor(() => {
        expect(screen.getByTestId('popover-input')).toHaveFocus();
      });
    });

    it('should focus the element provided to `initialFocus` as a ref when open', async () => {
      function Test() {
        const input2Ref = {value: null as HTMLInputElement | null};
        return (
          <div>
            <input />
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup initialFocus={input2Ref}>
                    <input data-testid="input-1" />
                    <input data-testid="input-2" ref={input2Ref} />
                    <input data-testid="input-3" />
                    <button>Close</button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input />
          </div>
        );
      }

      await render(<Test /> as any);
      await settle();

      fireEvent.click(screen.getByText('Open'));
      await settle();
      await settle();

      await waitFor(() => {
        expect(screen.getByTestId('input-2')).toHaveFocus();
      });
    });

    it('should not move focus when initialFocus is false', async () => {
      await render(
        <div>
          <input data-testid="outside" />
          <Popover.Root>
            <Popover.Trigger>Open</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup initialFocus={false}>
                  <input data-testid="popover-input" />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>,
      );
      await settle();

      const outside = screen.getByTestId('outside');
      outside.focus();

      fireEvent.click(screen.getByText('Open'));
      await settle();
      await settle();

      expect(screen.getByTestId('popover-input')).not.toHaveFocus();
    });
  });

  describe('prop: finalFocus', () => {
    it('should focus the trigger by default when closed', async () => {
      await render(
        <Popover.Root>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <input data-testid="popover-input" />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>,
      );
      await settle();

      const trigger = screen.getByText('Open');
      fireEvent.click(trigger);
      await settle();
      await settle();
      expect(screen.getByTestId('popover-input')).toHaveFocus();

      fireEvent.keyDown(document, {key: 'Escape'});
      await settle();
      await settle();

      expect(trigger).toHaveFocus();
    });

    it('should focus the element provided to the prop when closed', async () => {
      function Test() {
        const finalFocusRef = {value: null as HTMLInputElement | null};
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={finalFocusRef}>
                    <input data-testid="popover-input" />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input data-testid="final-focus" ref={finalFocusRef} />
          </div>
        );
      }

      await render(<Test /> as any);
      await settle();

      fireEvent.click(screen.getByText('Open'));
      await settle();
      await settle();

      fireEvent.keyDown(document, {key: 'Escape'});
      await settle();
      await settle();

      expect(screen.getByTestId('final-focus')).toHaveFocus();
    });
  });
});

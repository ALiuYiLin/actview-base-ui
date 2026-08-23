import { vi, test, describe, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { defineComponent, ref } from '@actview/core';
import { useFloating, useHover, useInteractions } from '@floating-ui/actview';
import { isJSDOM } from '@floating-ui/actview/utils';
import {
  act,
  cleanup,
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  waitFor,
} from '../rtl';
import { Popover } from './Popover';

type UseHoverProps = Parameters<typeof useHover>[1];

const App = defineComponent(function (
  props: UseHoverProps & { showReference?: boolean },
) {
  const open = ref(false);
  const { refs, context } = useFloating({
    open,
    onOpenChange: (o: boolean) => {
      open.value = o;
    },
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, props),
  ]);

  return () => (
    <>
      {(props.showReference ?? true) && (
        <button {...getReferenceProps({ ref: refs.setReference })} />
      )}
      {open.value && (
        <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })} />
      )}
    </>
  );
});

describe.skipIf(!isJSDOM)('useHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
  });

  test('opens on mouseenter', async () => {
    render(<App />);
    await flushMicrotasks();

    fireEvent.mouseEnter(screen.getByRole('button'));
    await flushMicrotasks();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('closes on mouseleave', async () => {
    render(<App />);
    await flushMicrotasks();

    fireEvent.mouseEnter(screen.getByRole('button'));
    await flushMicrotasks();
    fireEvent.mouseLeave(screen.getByRole('button'));
    await flushMicrotasks();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  describe('prop: delay', () => {
    test('symmetric number', async () => {
      render(<App delay={1000} />);
      await flushMicrotasks();

      fireEvent.mouseEnter(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(999);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('open', async () => {
      render(<App delay={{ open: 500 }} />);
      await flushMicrotasks();

      fireEvent.mouseEnter(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(499);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('close', async () => {
      render(<App delay={{ close: 500 }} />);
      await flushMicrotasks();

      fireEvent.mouseEnter(screen.getByRole('button'));
      await flushMicrotasks();
      fireEvent.mouseLeave(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(499);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('open with close 0', async () => {
      render(<App delay={{ open: 500 }} />);
      await flushMicrotasks();

      fireEvent.mouseEnter(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(499);
      });

      fireEvent.mouseLeave(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('restMs + nullish open delay should respect restMs', async () => {
      render(<App restMs={100} delay={{ close: 100 }} />);
      await flushMicrotasks();

      fireEvent.mouseEnter(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(99);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  test('restMs', async () => {
    render(<App restMs={100} />);
    await flushMicrotasks();

    const button = screen.getByRole('button');

    const originalDispatchEvent = button.dispatchEvent;
    const spy = vi.spyOn(button, 'dispatchEvent').mockImplementation((event) => {
      Object.defineProperty(event, 'movementX', { value: 10 });
      Object.defineProperty(event, 'movementY', { value: 10 });
      return originalDispatchEvent.call(button, event);
    });

    fireEvent.mouseMove(button);

    await act(async () => {
      vi.advanceTimersByTime(99);
    });

    fireEvent.mouseMove(button);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseMove(button);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    spy.mockRestore();
  });

  test.skip('restMs is always 0 for touch input', async () => {
    render(<App restMs={100} />);
    await flushMicrotasks();

    fireEvent.pointerDown(screen.getByRole('button'), { pointerType: 'touch' });
    fireEvent.mouseMove(screen.getByRole('button'));

    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  test('restMs does not reset timer for minor mouse movement', async () => {
    render(<App restMs={100} />);
    await flushMicrotasks();

    const button = screen.getByRole('button');

    const originalDispatchEvent = button.dispatchEvent;
    const spy = vi.spyOn(button, 'dispatchEvent').mockImplementation((event) => {
      Object.defineProperty(event, 'movementX', { value: 1 });
      Object.defineProperty(event, 'movementY', { value: 0 });
      return originalDispatchEvent.call(button, event);
    });

    fireEvent.mouseMove(button);

    await act(async () => {
      vi.advanceTimersByTime(99);
    });

    fireEvent.mouseMove(button);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    spy.mockRestore();
  });

  test('mouseleave on the floating element closes it (mouse)', async () => {
    render(<App />);
    await flushMicrotasks();

    fireEvent.mouseEnter(screen.getByRole('button'));
    await flushMicrotasks();

    fireEvent(
      screen.getByRole('button'),
      new MouseEvent('mouseleave', {
        relatedTarget: screen.getByRole('tooltip'),
      }),
    );
    await flushMicrotasks();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('does not show after delay if domReference changes', async () => {
    const { rerender } = render(<App delay={1000} />);

    fireEvent.mouseEnter(screen.getByRole('button'));

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    rerender({ showReference: false });

    await act(async () => {
      vi.advanceTimersByTime(999);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('reason string', async () => {
    const ReasonApp = defineComponent(function () {
      const isOpen = ref(false);
      const { refs, context } = useFloating({
        open: isOpen,
        onOpenChange(open: boolean, _?: any, reason?: string) {
          isOpen.value = open;
          expect(reason).toBe('hover');
        },
      });

      const hover = useHover(context);
      const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

      return () => (
        <>
          <button ref={refs.setReference} {...getReferenceProps()} />
          {isOpen.value && (
            <div role="tooltip" ref={refs.setFloating} {...getFloatingProps()} />
          )}
        </>
      );
    });

    render(<ReasonApp />);
    await flushMicrotasks();
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    await flushMicrotasks();
    fireEvent.mouseLeave(button);
    await flushMicrotasks();
  });

  test('does not treat a synthetic child target as inactive when the native path differs', async () => {
    const onOpenChange = vi.fn();

    const SyntheticApp = defineComponent(function () {
      const open = ref(true);
      const { refs, context } = useFloating({
        open,
        onOpenChange(nextOpen: boolean, _?: any, details?: any) {
          onOpenChange(nextOpen, details);
          open.value = nextOpen;
        },
      });
      const { getReferenceProps, getFloatingProps } = useInteractions([
        useHover(context),
      ]);

      return () => (
        <>
          <button ref={refs.setReference} {...getReferenceProps()}>
            <span data-testid="child" />
          </button>
          {open.value && (
            <div role="tooltip" ref={refs.setFloating} {...getFloatingProps()} />
          )}
        </>
      );
    });

    render(<SyntheticApp />);
    await flushMicrotasks();

    const child = screen.getByTestId('child');
    const event = new MouseEvent('mousemove', { bubbles: true });

    // Deliberately skew the native path so `getTarget(nativeEvent)` resolves
    // outside the trigger while React's synthetic `event.target` remains `child`.
    Object.defineProperty(event, 'composedPath', {
      configurable: true,
      value: () => [document.body, child.parentElement, child],
    });

    fireEvent(child, event);

    await flushMicrotasks();

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole('tooltip')).not.toBe(null);
  });

  test('cleans up blockPointerEvents if trigger changes', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(
      <Popover
        hover={false}
        modal={false}
        bubbles
        render={({ labelId, descriptionId, close }) => (
          <>
            <h2 id={labelId}>Parent title</h2>
            <p id={descriptionId}>Description</p>
            <Popover
              hover
              modal={false}
              bubbles
              render={({ labelId, descriptionId, close }) => (
                <>
                  <h2 id={labelId}>Child title</h2>
                  <p id={descriptionId}>Description</p>
                  <button type="button" onClick={close}>
                    Close
                  </button>
                </>
              )}
            >
              <button type="button">Open child</button>
            </Popover>
            <button type="button" onClick={close}>
              Close
            </button>
          </>
        )}
      >
        <button type="button">Open parent</button>
      </Popover>,
    );
    await flushMicrotasks();

    await user.click(screen.getByText('Open parent'));
    expect(screen.getByText('Parent title')).toBeInTheDocument();
    await user.click(screen.getByText('Open child'));
    expect(screen.getByText('Child title')).toBeInTheDocument();
    await user.click(screen.getByText('Child title'));
    // clean up blockPointerEvents
    // userEvent.unhover does not work because of the pointer-events
    fireEvent.mouseLeave(screen.getByRole('dialog', { name: 'Child title' }));
    expect(screen.getByText('Child title')).toBeInTheDocument();
    await user.click(screen.getByText('Parent title'));
    expect(screen.getByText('Parent title')).toBeInTheDocument();
  });
});

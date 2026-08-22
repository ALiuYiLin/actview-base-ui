import { describe, expect, it } from 'vitest';
import { ScrollAreaRoot } from '@/scroll-area/root/ScrollAreaRoot';
import { ScrollAreaViewport } from '@/scroll-area/viewport/ScrollAreaViewport';
import { ScrollAreaScrollbar } from '@/scroll-area/scrollbar/ScrollAreaScrollbar';
import { ScrollAreaThumb } from '@/scroll-area/thumb/ScrollAreaThumb';
import { createRenderer } from '../../../test/createRenderer';

describe('<ScrollArea.Scrollbar />', () => {
  const { render, fireEvent, act } = createRenderer();

  async function renderWheelTest(props: {
    orientation?: 'horizontal' | 'vertical';
    scrollLeft?: number;
    scrollTop?: number;
  }) {
    const { orientation = 'horizontal', scrollLeft = 0, scrollTop = 0 } = props;

    const result = await render(ScrollAreaRoot, {
      style: { width: 200, height: 200 },
      children: (
        <>
          <ScrollAreaViewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div style={{ width: 1000, height: 1000 }} />
          </ScrollAreaViewport>
          <ScrollAreaScrollbar
            orientation={orientation}
            data-testid="scrollbar"
            keepMounted
          />
        </>
      ),
    });

    const viewport = result.getByTestId('viewport');
    const scrollbar = result.getByTestId('scrollbar');

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 200 },
      clientWidth: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollWidth: { configurable: true, value: 1000 },
      scrollLeft: { configurable: true, writable: true, value: scrollLeft },
      scrollTop: { configurable: true, writable: true, value: scrollTop },
    });

    return { viewport, scrollbar };
  }

  it('clamps horizontal wheel scrolling at both edges', async () => {
    const { viewport, scrollbar } = await renderWheelTest({ orientation: 'horizontal' });

    fireEvent.wheel(scrollbar, { deltaX: -50 });
    expect(viewport.scrollLeft).toBe(0);

    viewport.scrollLeft = 790;
    fireEvent.wheel(scrollbar, { deltaX: 50 });
    expect(viewport.scrollLeft).toBe(800);

    fireEvent.wheel(scrollbar, { deltaX: 50 });
    expect(viewport.scrollLeft).toBe(800);
  });

  it('clamps vertical wheel scrolling at both edges', async () => {
    const { viewport, scrollbar } = await renderWheelTest({ orientation: 'vertical' });

    fireEvent.wheel(scrollbar, { deltaY: -50 });
    expect(viewport.scrollTop).toBe(0);

    viewport.scrollTop = 790;
    fireEvent.wheel(scrollbar, { deltaY: 50 });
    expect(viewport.scrollTop).toBe(800);

    fireEvent.wheel(scrollbar, { deltaY: 50 });
    expect(viewport.scrollTop).toBe(800);
  });

  it('does not intercept browser zoom gestures (ctrl + wheel)', async () => {
    const { viewport, scrollbar } = await renderWheelTest({
      orientation: 'vertical',
      scrollTop: 400,
    });

    fireEvent.wheel(scrollbar, { ctrlKey: true, deltaY: 50 });
    expect(viewport.scrollTop).toBe(400);
  });

  it('ignores zero-delta wheel events', async () => {
    const { viewport, scrollbar } = await renderWheelTest({
      orientation: 'vertical',
      scrollTop: 400,
    });

    fireEvent.wheel(scrollbar, { deltaY: 0 });
    expect(viewport.scrollTop).toBe(400);
  });

  it('marks the scroll area as scrolling when wheeling over the scrollbar', async () => {
    const result = await render(ScrollAreaRoot, {
      'data-testid': 'root',
      children: (
        <>
          <ScrollAreaViewport data-testid="viewport">
            <div style={{ width: 1000, height: 1000 }} />
          </ScrollAreaViewport>
          <ScrollAreaScrollbar
            orientation="vertical"
            keepMounted
            data-testid="scrollbar"
          />
        </>
      ),
    });

    const root = result.getByTestId('root');
    const viewport = result.getByTestId('viewport');
    const scrollbar = result.getByTestId('scrollbar');

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    fireEvent.wheel(scrollbar, { deltaY: 50 });
    await act(() => {});

    expect(root).toHaveAttribute('data-scrolling');
  });

  it('adds [data-hovering] on the scrollbar when the pointer moves over the viewport', async () => {
    const result = await render(ScrollAreaRoot, {
      'data-testid': 'root',
      children: (
        <>
          <ScrollAreaViewport data-testid="viewport">
            <div style={{ width: 100, height: 100 }} />
          </ScrollAreaViewport>
          <ScrollAreaScrollbar
            orientation="vertical"
            keepMounted
            data-testid="scrollbar"
          >
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        </>
      ),
    });

    const root = result.getByTestId('root');
    const viewport = result.getByTestId('viewport');
    const scrollbar = result.getByTestId('scrollbar');

    // Native `pointerenter`/`pointerleave` do not bubble (plantform-diff.md PD-05),
    // so hover detection relies on the bubbling `pointermove` handler on the root.
    fireEvent.pointerMove(viewport, { pointerType: 'mouse' });
    await act(() => {});

    expect(scrollbar).toHaveAttribute('data-hovering');

    // Leaving the scroll area clears hover; dispatch on the root itself since
    // `pointerleave` on a child does not reach the root handler natively.
    fireEvent.pointerLeave(root, { pointerType: 'mouse' });
    await act(() => {});

    expect(scrollbar).not.toHaveAttribute('data-hovering');
  });
});

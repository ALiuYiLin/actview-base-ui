import { describe, expect, it, vi } from 'vitest';
import { ScrollAreaRoot } from '@/scroll-area/root/ScrollAreaRoot';
import { ScrollAreaViewport } from '@/scroll-area/viewport/ScrollAreaViewport';
import { ScrollAreaScrollbar } from '@/scroll-area/scrollbar/ScrollAreaScrollbar';
import { ScrollAreaThumb } from '@/scroll-area/thumb/ScrollAreaThumb';
import { ScrollAreaCorner } from '@/scroll-area/corner/ScrollAreaCorner';
import { createRenderer } from '#/test/createRenderer';
import { SCROLL_TIMEOUT } from '@/scroll-area/constants';

describe('<ScrollArea.Root />', () => {
  const { render, fireEvent, act } = createRenderer();

  it('renders a group root with presentation semantics and relative positioning', async () => {
    const result = await render(ScrollAreaRoot, { 'data-testid': 'root' });

    const root = result.getByTestId('root');
    expect(root.tagName).toBe('DIV');
    expect(root).toHaveAttribute('role', 'presentation');
    expect(root.style.position).toBe('relative');
    // Corner size starts at 0.
    expect(root.style.getPropertyValue('--scroll-area-corner-width')).toBe('0px');
    expect(root.style.getPropertyValue('--scroll-area-corner-height')).toBe('0px');
  });

  it('renders a non-scrollable viewport out of tab order with a data-id', async () => {
    const result = await render(ScrollAreaRoot, {
      children: (
        <ScrollAreaViewport data-testid="viewport">
          <div style={{ width: 100, height: 100 }} />
        </ScrollAreaViewport>
      ),
    });

    const viewport = result.getByTestId('viewport');
    expect(viewport.tagName).toBe('DIV');
    expect(viewport).toHaveAttribute('role', 'presentation');
    expect(viewport).toHaveAttribute('tabindex', '-1');
    // In jsdom the viewport measures 0x0, so it never overflows and stays hidden.
    expect(viewport.dataset.id).toMatch(/-viewport$/);
  });

  it('renders a keepMounted scrollbar with its orientation attribute', async () => {
    const result = await render(ScrollAreaRoot, {
      children: (
        <>
          <ScrollAreaScrollbar
            orientation="vertical"
            keepMounted
            data-testid="vertical-scrollbar"
          >
            <ScrollAreaThumb data-testid="vertical-thumb" />
          </ScrollAreaScrollbar>
          <ScrollAreaScrollbar
            orientation="horizontal"
            keepMounted
            data-testid="horizontal-scrollbar"
          >
            <ScrollAreaThumb data-testid="horizontal-thumb" />
          </ScrollAreaScrollbar>
        </>
      ),
    });

    const verticalScrollbar = result.getByTestId('vertical-scrollbar');
    const horizontalScrollbar = result.getByTestId('horizontal-scrollbar');
    expect(verticalScrollbar).toHaveAttribute('data-orientation', 'vertical');
    expect(horizontalScrollbar).toHaveAttribute('data-orientation', 'horizontal');
    expect(verticalScrollbar.style.position).toBe('absolute');
    expect(verticalScrollbar.style.touchAction).toBe('none');

    const verticalThumb = result.getByTestId('vertical-thumb');
    const horizontalThumb = result.getByTestId('horizontal-thumb');
    // The thumb size is driven by the root's CSS variables.
    expect(verticalThumb.style.height).toBe('var(--scroll-area-thumb-height)');
    expect(horizontalThumb.style.width).toBe('var(--scroll-area-thumb-width)');
  });

  it('omits the corner when the viewport does not overflow', async () => {
    const result = await render(ScrollAreaRoot, {
      children: (
        <>
          <ScrollAreaViewport data-testid="viewport">
            <div style={{ width: 100, height: 100 }} />
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical" keepMounted data-testid="scrollbar">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
          <ScrollAreaCorner data-testid="corner" />
        </>
      ),
    });

    expect(result.queryByTestId('corner')).toBe(null);
  });

  it('adds and removes the [data-scrolling] attribute when the viewport is scrolled', async () => {
    vi.useFakeTimers();
    try {
      const result = await render(ScrollAreaRoot, {
        'data-testid': 'root',
        children: (
          <ScrollAreaViewport data-testid="viewport">
            <div style={{ width: 1000, height: 1000 }} />
          </ScrollAreaViewport>
        ),
      });

      const root = result.getByTestId('root');
      const viewport = result.getByTestId('viewport');

      expect(root).not.toHaveAttribute('data-scrolling');

      Object.defineProperties(viewport, {
        scrollTop: { configurable: true, writable: true, value: 1 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
      });

      // User interaction first: only user-driven scrolls (after a wheel/pointer/keyboard
      // event) report `scrolling`; programmatic scrolls are ignored.
      fireEvent.pointerMove(viewport, { pointerType: 'mouse' });
      fireEvent.scroll(viewport);
      await act(() => {});

      expect(root).toHaveAttribute('data-scrolling');

      await vi.advanceTimersByTimeAsync(SCROLL_TIMEOUT);

      expect(root).not.toHaveAttribute('data-scrolling');
    } finally {
      vi.useRealTimers();
    }
  });
});

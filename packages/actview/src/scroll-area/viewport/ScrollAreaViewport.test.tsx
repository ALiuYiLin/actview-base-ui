import { describe, expect, it } from 'vitest';
import { ScrollAreaRoot } from '@/scroll-area/root/ScrollAreaRoot';
import { ScrollAreaViewport } from '@/scroll-area/viewport/ScrollAreaViewport';
import { createRenderer } from '#/test/createRenderer';

describe('<ScrollArea.Viewport />', () => {
  const { render, fireEvent, act } = createRenderer();

  it('applies a data-id derived from the root id', async () => {
    const result = await render(ScrollAreaRoot, {
      children: (
        <ScrollAreaViewport data-testid="viewport">
          <div style={{ width: 100, height: 100 }} />
        </ScrollAreaViewport>
      ),
    });

    const viewport = result.getByTestId('viewport');
    expect(viewport.dataset.id).toMatch(/^base-ui-.*-viewport$/);
  });

  it('sets overflow edge CSS variables on scroll and clears them at the start edge', async () => {
    const result = await render(ScrollAreaRoot, {
      children: (
        <ScrollAreaViewport data-testid="viewport">
          <div style={{ width: 1000, height: 1000 }} />
        </ScrollAreaViewport>
      ),
    });

    const viewport = result.getByTestId('viewport');

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 200 },
      clientWidth: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollWidth: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });

    // Overflow variables are applied imperatively via `setProperty` (plantform-diff.md
    // PD-25), bypassing the object `style` rendering that drops `--*` keys.
    fireEvent.pointerMove(viewport, { pointerType: 'mouse' });
    fireEvent.scroll(viewport);
    await act(() => {});

    expect(viewport.style.getPropertyValue('--scroll-area-overflow-x-start')).toBe('0px');
    expect(viewport.style.getPropertyValue('--scroll-area-overflow-y-start')).toBe('0px');
    const xEnd = viewport.style.getPropertyValue('--scroll-area-overflow-x-end');
    const yEnd = viewport.style.getPropertyValue('--scroll-area-overflow-y-end');
    expect(xEnd).not.toBe('');
    expect(xEnd).not.toBe('0px');
    expect(yEnd).not.toBe('');
    expect(yEnd).not.toBe('0px');
  });
});

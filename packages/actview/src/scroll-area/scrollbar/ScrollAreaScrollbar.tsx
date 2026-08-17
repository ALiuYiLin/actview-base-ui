import { computed, watch } from 'actview';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { contains, getTarget } from '@base-ui/actview-utils/shadowDom';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { ScrollAreaScrollbarContext } from './ScrollAreaScrollbarContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { getOffset } from '../utils/getOffset';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { ScrollAreaRootState } from '../root/ScrollAreaRoot';

/**
 * A vertical or horizontal scrollbar for the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaScrollbar(componentProps: ScrollAreaScrollbar.Props) {
  const root = useScrollAreaRootContext();
  const direction = useDirection();

  const vertical = computed(() => (componentProps.orientation ?? 'vertical') === 'vertical');
  const keepMounted = computed(() => componentProps.keepMounted ?? false);
  const hideTrackUntilMeasured = computed(
    () => !root.value.hasMeasuredScrollbar && !keepMounted.value,
  );
  const isHidden = computed(() => (vertical.value ? root.value.hiddenState.y : root.value.hiddenState.x));
  const shouldRender = computed(() => keepMounted.value || !isHidden.value);

  const state = computed<ScrollAreaScrollbarState>(() => ({
    ...root.value.viewportState,
    hovering: root.value.hovering,
    scrolling: vertical.value ? root.value.scrollingY : root.value.scrollingX,
    orientation: componentProps.orientation ?? 'vertical',
  }));

  // The scrollbar element is conditionally mounted; pick the Y/X ref at attach time.
  const scrollbarRef = (node: HTMLDivElement | null) => {
    if (vertical.value) {
      root.value.scrollbarYRef.current = node;
    } else {
      root.value.scrollbarXRef.current = node;
    }
  };

  function handleWheel(event: WheelEvent) {
    const viewportEl = root.value.viewportRef.current;
    if (!viewportEl || event.ctrlKey) {
      return;
    }

    const horizontal = !vertical.value;
    const scrollProperty = horizontal ? 'scrollLeft' : 'scrollTop';
    const delta = horizontal ? event.deltaX : event.deltaY;
    if (delta === 0) {
      return;
    }

    const maxScroll = horizontal
      ? viewportEl.scrollWidth - viewportEl.clientWidth
      : viewportEl.scrollHeight - viewportEl.clientHeight;
    // RTL horizontal scrolling uses a negative `scrollLeft` range, from 0 to `-maxScroll`.
    const minScroll = horizontal && direction.value === 'rtl' ? -maxScroll : 0;
    const maxScrollValue = horizontal && direction.value === 'rtl' ? 0 : maxScroll;
    const scrollValue = viewportEl[scrollProperty];

    // At an edge (or with no overflow), let the wheel event chain to the
    // parent/page instead of swallowing it via `preventDefault`.
    if ((scrollValue <= minScroll && delta < 0) || (scrollValue >= maxScrollValue && delta > 0)) {
      return;
    }

    event.preventDefault();

    viewportEl[scrollProperty] = Math.min(
      maxScrollValue,
      Math.max(minScroll, scrollValue + delta),
    );

    root.value.handleScroll({ x: viewportEl.scrollLeft, y: viewportEl.scrollTop });
  }

  // Rebind the wheel listener whenever the element mounts, the scrollbar becomes
  // visible, or the direction flips (the listener is attached to the scrollbar
  // element, which only exists while `shouldRender` is true).
  let wheelCleanup: (() => void) | undefined;
  function bindWheelListener() {
    wheelCleanup?.();
    wheelCleanup = undefined;

    if (!shouldRender.value) {
      return;
    }

    const viewportEl = root.value.viewportRef.current;
    const scrollbarEl = vertical.value ? root.value.scrollbarYRef.current : root.value.scrollbarXRef.current;
    if (!scrollbarEl || !viewportEl) {
      return;
    }

    wheelCleanup = addEventListener(scrollbarEl, 'wheel', handleWheel, { passive: false });
  }

  useIsoLayoutEffect(() => {
    bindWheelListener();
    return () => {
      wheelCleanup?.();
      wheelCleanup = undefined;
    };
  });

  watch([shouldRender, direction, vertical], () => {
    bindWheelListener();
  });

  // ActView's object `style` rendering drops `--*` custom property keys (plantform-diff.md
  // PD-25), so the thumb-size variable is applied imperatively instead; the thumb styles
  // reference it through `var(...)` values, which render normally.
  function applyThumbVar() {
    const scrollbarEl = vertical.value
      ? root.value.scrollbarYRef.current
      : root.value.scrollbarXRef.current;
    if (!scrollbarEl) {
      return;
    }
    scrollbarEl.style.setProperty(
      vertical.value ? '--scroll-area-thumb-height' : '--scroll-area-thumb-width',
      `${vertical.value ? root.value.thumbSize.height : root.value.thumbSize.width}px`,
    );
  }

  useIsoLayoutEffect(() => {
    applyThumbVar();
  });

  // Watch scalar values, not the object literals from the root context (plantform-diff.md
  // AD-13): ActView compares watch sources by reference, so object sources recreated on every
  // context recompute would retrigger this watch forever.
  watch(
    [
      () => root.value.thumbSize.width,
      () => root.value.thumbSize.height,
      shouldRender,
      vertical,
    ],
    () => {
      applyThumbVar();
    },
  );

  const getScrollbarProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    ...(root.value.rootId && { 'data-id': `${root.value.rootId}-scrollbar` }),
    onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }

      const target = getTarget(event) as Element | null;
      const thumbEl = vertical.value ? root.value.thumbYRef.current : root.value.thumbXRef.current;

      // Ignore clicks on thumb, including cases where React retargets the
      // synthetic event to the track host across a shadow boundary.
      if (thumbEl && contains(thumbEl, target)) {
        return;
      }

      const viewportEl = root.value.viewportRef.current;
      if (!viewportEl) {
        return;
      }

      const scrollbarEl = vertical.value ? root.value.scrollbarYRef.current : root.value.scrollbarXRef.current;

      if (!thumbEl || !scrollbarEl) {
        return;
      }

      const axis = vertical.value ? 'y' : 'x';
      const thumbOffset = getOffset(thumbEl, 'margin', axis);
      const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
      const thumbSizePx = vertical.value ? thumbEl.offsetHeight : thumbEl.offsetWidth;
      const trackRect = scrollbarEl.getBoundingClientRect();
      const clickPosition = vertical.value
        ? event.clientY - trackRect.top - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2
        : event.clientX - trackRect.left - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2;

      const scrollableSize = vertical.value ? viewportEl.scrollHeight : viewportEl.scrollWidth;
      const viewportSize = vertical.value ? viewportEl.clientHeight : viewportEl.clientWidth;
      const trackSize = vertical.value ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;

      const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
      // A short or heavily padded track can drive `maxThumbOffset` to zero or
      // negative once the thumb hits its `MIN_THUMB_SIZE` floor. Dividing by it
      // would yield a non-finite (`Infinity`/`NaN`) or inverted scroll position.
      if (maxThumbOffset <= 0) {
        return;
      }

      const scrollRatio = clickPosition / maxThumbOffset;
      const maxScrollDistance = scrollableSize - viewportSize;

      // Disable snapping before the jump-to-click assignment, or the
      // assigned position quantizes to the nearest snap point and the thumb
      // stays offset from the pointer for the whole drag. `handlePointerDown`
      // below re-runs this as a guarded no-op for the thumb-drag path.
      root.value.disableViewportSnap();

      if (vertical.value) {
        viewportEl.scrollTop = scrollRatio * maxScrollDistance;
      } else if (direction.value === 'rtl') {
        viewportEl.scrollLeft = -(1 - scrollRatio) * maxScrollDistance;
      } else {
        viewportEl.scrollLeft = scrollRatio * maxScrollDistance;
      }

      root.value.handleScroll({ x: viewportEl.scrollLeft, y: viewportEl.scrollTop });

      root.value.handlePointerDown(event);
    },
    // Native scrollbars don't move focus when pressed, whichever button is used.
    // Handled here rather than on the thumb so the bubbled press covers both.
    onMouseDown(event) {
      event.preventDefault();
    },
    onPointerUp: root.value.handlePointerUp,
    // Mirror `onPointerUp` so a browser-cancelled gesture on the track (no thumb
    // child captures the pointer) still clears the drag state.
    onPointerCancel: root.value.handlePointerUp,
    style: {
      position: 'absolute',
      touchAction: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      ...(hideTrackUntilMeasured.value ? { visibility: 'hidden' } : null),
      ...(vertical.value
        ? {
            top: 0,
            bottom: 'var(--scroll-area-corner-height)',
            insetInlineEnd: 0,
          }
        : {
            insetInlineStart: 0,
            insetInlineEnd: 'var(--scroll-area-corner-width)',
            bottom: 0,
          }),
    },
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      orientation: _orientation,
      keepMounted: _keepMounted,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, scrollbarRef],
    state,
    props: [getScrollbarProps, getElementProps],
    stateAttributesMapping: scrollAreaStateAttributesMapping,
  });

  return (
    <ScrollAreaScrollbarContext.Provider
      value={computed(() => componentProps.orientation ?? 'vertical')}
    >
      {shouldRender.value ? getElement() : null}
    </ScrollAreaScrollbarContext.Provider>
  );
}

export interface ScrollAreaScrollbarState extends ScrollAreaRootState {
  /**
   * Whether the scroll area is being hovered.
   */
  hovering: boolean;
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * The orientation of the scrollbar.
   */
  orientation: 'vertical' | 'horizontal';
}

export interface ScrollAreaScrollbarProps extends BaseUIComponentProps<
  'div',
  ScrollAreaScrollbarState
> {
  /**
   * Whether the scrollbar controls vertical or horizontal scroll.
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal' | undefined;
  /**
   * Whether to keep the HTML element in the DOM when the viewport isn't scrollable.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace ScrollAreaScrollbar {
  export type State = ScrollAreaScrollbarState;
  export type Props = ScrollAreaScrollbarProps;
}

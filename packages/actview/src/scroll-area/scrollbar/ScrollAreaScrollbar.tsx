import { defineComponent, onMounted, onUnmounted, ref, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { getOffset } from '../utils/getOffset';
import { contains, getTarget } from '@/utils/shadowDom';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { ScrollAreaRootState } from '../root/ScrollAreaRoot';
import { ScrollAreaScrollbarContext } from './ScrollAreaScrollbarContext';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

/**
 * A vertical or horizontal scrollbar for the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export const ScrollAreaScrollbar = defineComponent(function (
  componentProps: ScrollAreaScrollbar.Props,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const orientation = toValue(componentProps.orientation) ?? 'vertical';
  const keepMounted = toValue(componentProps.keepMounted) ?? false;

  const rootContextRef = useScrollAreaRootContext();
  const scrollbarRef = useRootElement();

  const vertical = orientation === 'vertical';

  const direction = useDirection();
  const hideTrackUntilMeasured = () =>
    !rootContextRef.value.hasMeasuredScrollbar && !keepMounted;
  const isHidden = () => (vertical ? rootContextRef.value.hiddenState.y : rootContextRef.value.hiddenState.x);
  const shouldRender = () => keepMounted || !isHidden();

  // React 版 useEffect：wheel 事件（捕获到 scrollbar 元素上）
  let wheelCleanup: (() => void) | undefined;
  const setupWheel = () => {
    wheelCleanup?.();
    wheelCleanup = undefined;

    if (!shouldRender()) {
      return;
    }

    const viewportEl = rootContextRef.value.viewportRef.value;
    const scrollbarEl = scrollbarRef.value;

    if (!scrollbarEl) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (!viewportEl || event.ctrlKey) {
        return;
      }

      const horizontal = !vertical;
      const scrollProperty = horizontal ? 'scrollLeft' : 'scrollTop';
      const delta = horizontal ? event.deltaX : event.deltaY;
      if (delta === 0) {
        return;
      }

      const maxScroll = horizontal
        ? viewportEl.scrollWidth - viewportEl.clientWidth
        : viewportEl.scrollHeight - viewportEl.clientHeight;
      // RTL horizontal scrolling uses a negative `scrollLeft` range, from 0 to `-maxScroll`.
      const directionValue = direction.value;
      const minScroll = horizontal && directionValue === 'rtl' ? -maxScroll : 0;
      const maxScrollValue = horizontal && directionValue === 'rtl' ? 0 : maxScroll;
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

      rootContextRef.value.handleScroll({x: viewportEl.scrollLeft, y: viewportEl.scrollTop});
    }

    scrollbarEl.addEventListener('wheel', handleWheel, {passive: false});
    wheelCleanup = () => {
      scrollbarEl.removeEventListener('wheel', handleWheel);
    };
  };

  onMounted(() => {
    // 等待 ref 填充 + 首次渲染
    queueMicrotask(setupWheel);
  });
  onUnmounted(() => {
    wheelCleanup?.();
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {
      hovering,
      scrollingX,
      scrollingY,
      hiddenState,
      viewportRef,
      thumbYRef,
      thumbXRef,
      handlePointerDown,
      handlePointerUp,
      handleScroll,
      disableViewportSnap,
      rootId,
      thumbSize,
      viewportState,
    } = rootContextRef.value;

    const directionValue = direction.value;

    const stateValue: ScrollAreaScrollbarState = {
      ...viewportState,
      hovering,
      scrolling: vertical ? scrollingY : scrollingX,
      orientation,
    };

    const trackIsHidden = hideTrackUntilMeasured();

    const props: HTMLProps = {
      ...(rootId && {'data-id': `${rootId}-scrollbar`}),
      onPointerDown(event: any) {
        if (event.button !== 0) {
          return;
        }

        const target = getTarget(event.nativeEvent ?? event) as Element | null;
        const thumbEl = vertical ? thumbYRef.value : thumbXRef.value;

        // Ignore clicks on thumb, including cases where React retargets the
        // synthetic event to the track host across a shadow boundary.
        if (thumbEl && contains(thumbEl, target)) {
          return;
        }

        const viewportEl = viewportRef.value;
        if (!viewportEl) {
          return;
        }

        const scrollbarEl = scrollbarRef.value;

        if (!thumbEl || !scrollbarEl) {
          return;
        }

        const axis = vertical ? 'y' : 'x';
        const thumbOffset = getOffset(thumbEl, 'margin', axis);
        const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
        const thumbSizePx = vertical ? thumbEl.offsetHeight : thumbEl.offsetWidth;
        const trackRect = scrollbarEl.getBoundingClientRect();
        const clickPosition = vertical
          ? event.clientY - trackRect.top - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2
          : event.clientX - trackRect.left - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2;

        const scrollableSize = vertical ? viewportEl.scrollHeight : viewportEl.scrollWidth;
        const viewportSize = vertical ? viewportEl.clientHeight : viewportEl.clientWidth;
        const trackSize = vertical ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;

        const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
        // A short or heavily padded track can drive `maxThumbOffset` to zero or
        // negative once the thumb hits its `MIN_THUMB_SIZE` floor.
        if (maxThumbOffset <= 0) {
          return;
        }

        const scrollRatio = clickPosition / maxThumbOffset;
        const maxScrollDistance = scrollableSize - viewportSize;

        // Disable snapping before the jump-to-click assignment.
        disableViewportSnap();

        if (vertical) {
          viewportEl.scrollTop = scrollRatio * maxScrollDistance;
        } else if (directionValue === 'rtl') {
          viewportEl.scrollLeft = -(1 - scrollRatio) * maxScrollDistance;
        } else {
          viewportEl.scrollLeft = scrollRatio * maxScrollDistance;
        }

        handleScroll({x: viewportEl.scrollLeft, y: viewportEl.scrollTop});

        handlePointerDown(event);
      },
      // Native scrollbars don't move focus when pressed, whichever button is used.
      // Handled here rather than on the thumb so the bubbled press covers both.
      onMouseDown(event: any) {
        event.preventDefault();
      },
      onPointerUp: handlePointerUp,
      // Mirror `onPointerUp` so a browser-cancelled gesture on the track still
      // clears the drag state.
      ...({onPointerCancel: handlePointerUp} as any),
      style: {
        position: 'absolute',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        visibility: trackIsHidden ? 'hidden' : undefined,
        ...(vertical
          ? {
              top: 0,
              bottom: 'var(--scroll-area-corner-height)',
              insetInlineEnd: 0,
              ['--scroll-area-thumb-height' as string]: `${thumbSize.height}px`,
            }
          : {
              insetInlineStart: 0,
              insetInlineEnd: 'var(--scroll-area-corner-width)',
              bottom: 0,
              ['--scroll-area-thumb-width' as string]: `${thumbSize.width}px`,
            }),
      },
    };

    const stateAttributes = getStateAttributesProps(stateValue, scrollAreaStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, props, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, props.style, style(stateValue) as any);
    } else if (style !== undefined) {
      merged.style = Object.assign({}, props.style, style);
    }

    if (!shouldRender()) {
      return null;
    }

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: scrollbarRef} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={scrollbarRef} />;
      }
    } else {
      element = <div {...merged} ref={scrollbarRef} />;
    }

    return (
      <ScrollAreaScrollbarContext.Provider value={orientation as any}>
        {element}
      </ScrollAreaScrollbarContext.Provider>
    );
  };
}) as unknown as (props: ScrollAreaScrollbar.Props) => JSX.Element;

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

export interface ScrollAreaScrollbarProps
  extends BaseUIComponentProps<'div', ScrollAreaScrollbarState> {
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

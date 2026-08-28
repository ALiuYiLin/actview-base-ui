import {onMounted, onUnmounted, ref, toValue, toRefs, unrefs, useRootElement, shallowRef} from 'actview';
import { platform } from '@/utils/platform';
import { useTimeout } from '@/utils/useTimeout';
import { clamp } from '@/utils/clamp';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { ScrollAreaViewportContext } from './ScrollAreaViewportContext';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { getOffset } from '../utils/getOffset';
import { MIN_THUMB_SIZE } from '../constants';
import { styleDisableScrollbar } from '@/utils/styles';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { HiddenState, ScrollAreaRootState } from '../root/ScrollAreaRoot';
import { normalizeScrollOffset } from '@/utils/scrollEdges';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

// CSS variable names inlined so `ScrollAreaViewportCssVars` tree-shakes out.
const OVERFLOW_EDGE_VARS = [
  '--scroll-area-overflow-x-start',
  '--scroll-area-overflow-x-end',
  '--scroll-area-overflow-y-start',
  '--scroll-area-overflow-y-end',
];

// Module-level flag to ensure we only register the CSS properties once,
// regardless of how many Scroll Area components are mounted.
let scrollAreaOverflowVarsRegistered = false;

/**
 * Removes inheritance of the scroll area overflow CSS variables, which
 * improves rendering performance in complex scroll areas with deep subtrees.
 */
function removeCSSVariableInheritance() {
  if (
    scrollAreaOverflowVarsRegistered ||
    // When `inherits: false`, specifying `inherit` on child elements doesn't work
    // in Safari. To let CSS features work correctly, this optimization must be skipped.
    platform.engine.webkit
  ) {
    return;
  }

  if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
    OVERFLOW_EDGE_VARS.forEach((name) => {
      try {
        CSS.registerProperty({
          name,
          syntax: '<length>',
          inherits: false,
          initialValue: '0px',
        });
      } catch {
        /* ignore already-registered */
      }
    });
  }

  scrollAreaOverflowVarsRegistered = true;
}

/**
 * The actual scrollable container of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaViewport(componentProps: ScrollAreaViewport.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<ScrollAreaViewportContext.Provider>`），无 Fragment 根问题。
  const rootContextRef = useScrollAreaRootContext();
  const viewportRef = useRootElement();

  const direction = useDirection();

  const programmaticScrollRef = ref(true);
  const lastMeasuredViewportMetricsRef = shallowRef([NaN, NaN, NaN, NaN] as [number, number, number, number]);

  const scrollEndTimeout = useTimeout();
  const waitForAnimationsTimeout = useTimeout();

  const computeThumbPosition = () => {
    const viewportEl = viewportRef.value;
    const scrollbarYEl = rootContextRef.value.scrollbarYRef.value;
    const scrollbarXEl = rootContextRef.value.scrollbarXRef.value;
    const thumbYEl = rootContextRef.value.thumbYRef.value;
    const thumbXEl = rootContextRef.value.thumbXRef.value;
    const cornerEl = rootContextRef.value.cornerRef.value;

    if (!viewportEl) {
      return;
    }

    const scrollableContentHeight = viewportEl.scrollHeight;
    const scrollableContentWidth = viewportEl.scrollWidth;
    const viewportHeight = viewportEl.clientHeight;
    const viewportWidth = viewportEl.clientWidth;
    const scrollTop = viewportEl.scrollTop;
    const scrollLeft = viewportEl.scrollLeft;
    const lastMeasuredViewportMetrics = lastMeasuredViewportMetricsRef.value;
    const isFirstMeasurement = Number.isNaN(lastMeasuredViewportMetrics[0]);

    lastMeasuredViewportMetrics[0] = viewportHeight;
    lastMeasuredViewportMetrics[1] = scrollableContentHeight;
    lastMeasuredViewportMetrics[2] = viewportWidth;
    lastMeasuredViewportMetrics[3] = scrollableContentWidth;

    if (isFirstMeasurement) {
      rootContextRef.value.setHasMeasuredScrollbar(true);
    }

    if (scrollableContentHeight === 0 || scrollableContentWidth === 0) {
      return;
    }

    const directionValue = direction.value;
    const overflowEdgeThreshold = rootContextRef.value.overflowEdgeThreshold;

    const nextHiddenState = getHiddenState(viewportEl);
    const scrollbarYHidden = nextHiddenState.y;
    const scrollbarXHidden = nextHiddenState.x;
    const ratioX = viewportWidth / scrollableContentWidth;
    const ratioY = viewportHeight / scrollableContentHeight;
    const maxScrollLeft = Math.max(0, scrollableContentWidth - viewportWidth);
    const maxScrollTop = Math.max(0, scrollableContentHeight - viewportHeight);

    let scrollLeftFromStart = 0;
    let scrollLeftFromEnd = 0;
    if (!scrollbarXHidden) {
      scrollLeftFromStart = normalizeScrollOffset(
        directionValue === 'rtl' ? -scrollLeft : scrollLeft,
        maxScrollLeft,
      );
      scrollLeftFromEnd = maxScrollLeft - scrollLeftFromStart;
    }

    const scrollTopFromStart = scrollbarYHidden ? 0 : normalizeScrollOffset(scrollTop, maxScrollTop);
    const scrollTopFromEnd = scrollbarYHidden ? 0 : maxScrollTop - scrollTopFromStart;
    const nextWidth = scrollbarXHidden ? 0 : viewportWidth;
    const nextHeight = scrollbarYHidden ? 0 : viewportHeight;

    let nextCornerWidth = 0;
    let nextCornerHeight = 0;
    if (!scrollbarXHidden && !scrollbarYHidden) {
      nextCornerWidth = scrollbarYEl?.offsetWidth || 0;
      nextCornerHeight = scrollbarXEl?.offsetHeight || 0;
    }

    // Only subtract corner size from scrollbar dimensions if the corner hasn't been sized yet.
    const cornerSize = rootContextRef.value.cornerSize;
    const cornerNotYetSized = cornerSize.width === 0 && cornerSize.height === 0;
    const cornerWidthOffset = cornerNotYetSized ? nextCornerWidth : 0;
    const cornerHeightOffset = cornerNotYetSized ? nextCornerHeight : 0;

    const scrollbarXOffset = getOffset(scrollbarXEl, 'padding', 'x');
    const scrollbarYOffset = getOffset(scrollbarYEl, 'padding', 'y');
    const thumbXOffset = getOffset(thumbXEl, 'margin', 'x');
    const thumbYOffset = getOffset(thumbYEl, 'margin', 'y');

    const idealNextWidth = nextWidth - scrollbarXOffset - thumbXOffset;
    const idealNextHeight = nextHeight - scrollbarYOffset - thumbYOffset;

    const maxNextWidth = scrollbarXEl
      ? Math.min(scrollbarXEl.offsetWidth - cornerWidthOffset, idealNextWidth)
      : idealNextWidth;
    const maxNextHeight = scrollbarYEl
      ? Math.min(scrollbarYEl.offsetHeight - cornerHeightOffset, idealNextHeight)
      : idealNextHeight;

    const clampedNextWidth = Math.max(MIN_THUMB_SIZE, maxNextWidth * ratioX);
    const clampedNextHeight = Math.max(MIN_THUMB_SIZE, maxNextHeight * ratioY);

    rootContextRef.value.setThumbSize(
      pickState(rootContextRef.value.thumbSize, {width: clampedNextWidth, height: clampedNextHeight}),
    );

    // Handle Y (vertical) scroll
    if (scrollbarYEl && thumbYEl) {
      const maxThumbOffsetY =
        scrollbarYEl.offsetHeight - clampedNextHeight - scrollbarYOffset - thumbYOffset;

      const thumbOffsetY = applyOverscrollThumb(
        thumbYEl,
        '--scroll-area-thumb-height',
        scrollTop,
        maxScrollTop,
        scrollableContentHeight,
        clampedNextHeight,
        maxThumbOffsetY,
      );
      thumbYEl.style.transform = `translate3d(0,${thumbOffsetY}px,0)`;
    }

    // Handle X (horizontal) scroll
    if (scrollbarXEl && thumbXEl) {
      const maxThumbOffsetX =
        scrollbarXEl.offsetWidth - clampedNextWidth - scrollbarXOffset - thumbXOffset;
      const scrollFromStart = directionValue === 'rtl' ? -scrollLeft : scrollLeft;

      const offsetX = applyOverscrollThumb(
        thumbXEl,
        '--scroll-area-thumb-width',
        scrollFromStart,
        maxScrollLeft,
        scrollableContentWidth,
        clampedNextWidth,
        maxThumbOffsetX,
      );
      thumbXEl.style.transform = `translate3d(${directionValue === 'rtl' ? -offsetX : offsetX}px,0,0)`;
    }

    const overflowMetricsPx = [scrollLeftFromStart, scrollLeftFromEnd, scrollTopFromStart, scrollTopFromEnd];

    OVERFLOW_EDGE_VARS.forEach((cssVar, index) => {
      viewportEl.style.setProperty(cssVar, `${overflowMetricsPx[index]}px`);
    });

    if (cornerEl) {
      rootContextRef.value.setCornerSize(
        pickState(rootContextRef.value.cornerSize, {width: nextCornerWidth, height: nextCornerHeight}),
      );
    }

    rootContextRef.value.setHiddenState(pickState(rootContextRef.value.hiddenState, nextHiddenState));

    const nextOverflowEdges = {
      xStart: !scrollbarXHidden && scrollLeftFromStart > overflowEdgeThreshold.xStart,
      xEnd: !scrollbarXHidden && scrollLeftFromEnd > overflowEdgeThreshold.xEnd,
      yStart: !scrollbarYHidden && scrollTopFromStart > overflowEdgeThreshold.yStart,
      yEnd: !scrollbarYHidden && scrollTopFromEnd > overflowEdgeThreshold.yEnd,
    };

    rootContextRef.value.setOverflowEdges(pickState(rootContextRef.value.overflowEdges, nextOverflowEdges));
  };

  // useIsoLayoutEffect：注册 CSS 属性 + 挂载后测量
  removeCSSVariableInheritance();

  let resizeObserver: ResizeObserver | null = null;
  let hasInitializedResize = false;

  onMounted(() => {
    // `onMouseEnter` doesn't fire upon load, so we need to check if the viewport is already
    // being hovered.
    if (viewportRef.value?.matches(':hover')) {
      rootContextRef.value.setHovering(true);
    }

    queueMicrotask(computeThumbPosition);

    const viewport = viewportRef.value;
    if (typeof ResizeObserver === 'undefined' || !viewport) {
      return;
    }

    resizeObserver = new ResizeObserver(() => {
      if (!hasInitializedResize) {
        hasInitializedResize = true;
        const lastMeasuredViewportMetrics = lastMeasuredViewportMetricsRef.value;
        if (
          lastMeasuredViewportMetrics[0] === viewport.clientHeight &&
          lastMeasuredViewportMetrics[1] === viewport.scrollHeight &&
          lastMeasuredViewportMetrics[2] === viewport.clientWidth &&
          lastMeasuredViewportMetrics[3] === viewport.scrollWidth
        ) {
          return;
        }
      }

      computeThumbPosition();
    });

    resizeObserver.observe(viewport);

    // Wait for subtree animations to finish, then recompute thumb geometry that
    // may have been affected by transform-based animations.
    waitForAnimationsTimeout.start(0, () => {
      const animations = viewport.getAnimations({subtree: true});
      if (animations.length === 0) {
        return;
      }

      Promise.allSettled(animations.map((animation) => animation.finished))
        .then(computeThumbPosition)
        .catch(() => {});
    });
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    waitForAnimationsTimeout.clear();
  });

  function handleUserInteraction() {
    programmaticScrollRef.value = false;
  }

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {rootId, hiddenState, handleScroll, touchModality, viewportState} =
        rootContextRef.value;

      const p: Record<string, any> = {
        role: 'presentation',
        ...(rootId && {'data-id': `${rootId}-viewport`}),
        // Keep non-scrollable viewports out of tab order.
        tabIndex: hiddenState.x && hiddenState.y ? -1 : 0,
        className: styleDisableScrollbar.className,
        style: {
          overflow: 'scroll',
        },
        onScroll() {
          if (!viewportRef.value) {
            return;
          }

          computeThumbPosition();

          // WebKit consumes a touch that catches an in-flight momentum scroll or
          // rubber-band bounce without dispatching any DOM events for the whole
          // gesture, so scrolls cannot be attributed to the user through events.
          if (touchModality || !programmaticScrollRef.value) {
            handleScroll({
              x: viewportRef.value.scrollLeft,
              y: viewportRef.value.scrollTop,
            });
          }

          // Debounce the restoration of the programmatic flag so that it only
          // flips back to `true` once scrolling has come to a rest.
          scrollEndTimeout.start(100, () => {
            programmaticScrollRef.value = true;
          });
        },
        onWheel: handleUserInteraction,
        onPointerMove: handleUserInteraction,
        onPointerEnter: handleUserInteraction,
        onKeyDown: handleUserInteraction,
      };

      const merged: any = {};
      Object.assign(merged, p, {...unrefs(elementProps)});
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(viewportState) : style?.value;
      if (resolvedStyle !== undefined) {
        merged.style = Object.assign({}, p.style, resolvedStyle);
      }
      return [merged];
    },
    state: () => rootContextRef.value.viewportState,
    stateAttributesMapping: scrollAreaStateAttributesMapping as any,
    className,
    render,
    refs: () => [viewportRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ScrollAreaViewportContext.Provider value={{computeThumbPosition} as any}>
      {element()}
    </ScrollAreaViewportContext.Provider>
  );
}

export interface ScrollAreaViewportProps extends BaseUIComponentProps<'div', ScrollAreaViewportState> {}

export interface ScrollAreaViewportState extends ScrollAreaRootState {}

export namespace ScrollAreaViewport {
  export type Props = ScrollAreaViewportProps;
  export type State = ScrollAreaViewportState;
}

function getHiddenState(viewport: HTMLElement): HiddenState {
  const y = viewport.clientHeight >= viewport.scrollHeight;
  const x = viewport.clientWidth >= viewport.scrollWidth;

  return {
    y,
    x,
    corner: y || x,
  };
}

/**
 * Returns `prev` when `next` is shallow-equal to it so setState bails out and
 * scroll-frame updates don't rebuild the root context.
 */
function pickState<T extends object>(prev: T, next: T): T {
  for (const key in next) {
    if (prev[key as keyof T] !== next[key as keyof T]) {
      return next;
    }
  }

  return prev;
}

/**
 * Sizes the thumb and returns its axis offset. On overscroll (Safari rubber-band only) it shrinks
 * against the pinned edge, damped by `content / (content + overscroll)` to match native feedback;
 * the size flows through the thumb-size variable so the resting `var(...)` still applies.
 */
function applyOverscrollThumb(
  thumbEl: HTMLElement,
  sizeVar: string,
  scrollFromStart: number,
  maxScroll: number,
  content: number,
  size: number,
  maxThumbOffset: number,
): number {
  const clamped = clamp(scrollFromStart, 0, maxScroll);
  const overscroll = scrollFromStart - clamped;
  const nextSize = Math.max(MIN_THUMB_SIZE, (size * content) / (content + Math.abs(overscroll)));

  // Passing an empty string removes the override, restoring the resting `var(...)` size.
  thumbEl.style.setProperty(sizeVar, overscroll ? `${nextSize}px` : '');

  // Slide proportionally; at the end edge push down by the shrink so the thumb stays pinned to
  // it, while a start overscroll pins to offset 0.
  const offset = maxScroll ? (clamped / maxScroll) * maxThumbOffset : 0;
  return offset + (overscroll > 0 ? size - nextSize : 0);
}

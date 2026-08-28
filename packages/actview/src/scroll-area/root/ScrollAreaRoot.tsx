import { ref, toValue, toRefs, unrefs, useRootElement } from 'actview';
import { useTimeout } from '@/utils/useTimeout';
import type { BaseUIComponentProps } from '@/internals/types';
import { ScrollAreaRootContext } from './ScrollAreaRootContext';
import { SCROLL_TIMEOUT } from '../constants';
import { getOffset } from '../utils/getOffset';
import { styleDisableScrollbar } from '@/utils/styles';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { scrollAreaStateAttributesMapping } from './stateAttributes';
import { contains } from '@/utils/shadowDom';
import { useCSPContext } from '@/internals/csp-context/CSPContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

const DEFAULT_COORDS = {x: 0, y: 0};
const DEFAULT_SIZE = {width: 0, height: 0};
const DEFAULT_OVERFLOW_EDGES = {xStart: false, xEnd: false, yStart: false, yEnd: false};
const DEFAULT_HIDDEN_STATE = {x: true, y: true, corner: true};

export type HiddenState = typeof DEFAULT_HIDDEN_STATE;
export type OverflowEdges = typeof DEFAULT_OVERFLOW_EDGES;
export type Size = typeof DEFAULT_SIZE;
export type Coords = typeof DEFAULT_COORDS;

/**
 * Groups all parts of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaRoot(componentProps: ScrollAreaRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<ScrollAreaRootContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();

  const overflowEdgeThresholdProp = toValue(componentProps.overflowEdgeThreshold);
  const {xStart, xEnd, yStart, yEnd} = normalizeOverflowEdgeThreshold(overflowEdgeThresholdProp);

  const rootId = useBaseUiId();

  const scrollYTimeout = useTimeout();
  const scrollXTimeout = useTimeout();

  const {nonce, disableStyleElements} = toValue(useCSPContext());

  const hovering = ref(false);
  const scrollingX = ref(false);
  const scrollingY = ref(false);
  const touchModality = ref(false);
  const hasMeasuredScrollbar = ref(false);
  const cornerSize = ref<Size>(DEFAULT_SIZE);
  const thumbSize = ref<Size>(DEFAULT_SIZE);
  const overflowEdges = ref<OverflowEdges>(DEFAULT_OVERFLOW_EDGES);
  const hiddenState = ref<HiddenState>(DEFAULT_HIDDEN_STATE);

  const viewportRef = ref(null as HTMLDivElement | null);
  const scrollbarYRef = ref(null as HTMLDivElement | null);
  const scrollbarXRef = ref(null as HTMLDivElement | null);
  const thumbYRef = ref(null as HTMLDivElement | null);
  const thumbXRef = ref(null as HTMLDivElement | null);
  const cornerRef = ref(null as HTMLDivElement | null);

  const activePointerIdRef = ref(null as number | null);
  const startYRef = ref(0);
  const startXRef = ref(0);
  const startScrollTopRef = ref(0);
  const startScrollLeftRef = ref(0);
  const currentOrientationRef = ref('vertical' as 'vertical' | 'horizontal');
  const scrollPositionRef = ref(DEFAULT_COORDS);
  const savedSnapTypeRef = ref(null as string | null);

  function startScrolling(vertical: boolean) {
    const setScrolling = vertical ? scrollingY : scrollingX;
    const timeout = vertical ? scrollYTimeout : scrollXTimeout;

    setScrolling.value = true;
    timeout.start(SCROLL_TIMEOUT, () => {
      setScrolling.value = false;
    });
  }

  const handleScroll = (scrollPosition: Coords) => {
    const offsetX = scrollPosition.x - scrollPositionRef.value.x;
    const offsetY = scrollPosition.y - scrollPositionRef.value.y;

    scrollPositionRef.value = scrollPosition;

    if (offsetY !== 0) {
      startScrolling(true);
    }

    if (offsetX !== 0) {
      startScrolling(false);
    }
  };

  // CSS scroll snap forces every programmatic scroll to land on a snap
  // point, making thumb dragging jump between snap points. Native
  // scrollbars suppress snapping while dragging, so disable it until the
  // pointer is released; restoring the value re-snaps the viewport.
  const disableViewportSnap = () => {
    const viewportEl = viewportRef.value;
    if (viewportEl && savedSnapTypeRef.value === null) {
      savedSnapTypeRef.value = viewportEl.style.scrollSnapType;
      viewportEl.style.scrollSnapType = 'none';
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    if (activePointerIdRef.value !== null) {
      const activeThumb =
        currentOrientationRef.value === 'vertical' ? thumbYRef.value : thumbXRef.value;
      if (activeThumb?.hasPointerCapture(activePointerIdRef.value)) {
        return;
      }
    }

    activePointerIdRef.value = event.pointerId;
    startYRef.value = event.clientY;
    startXRef.value = event.clientX;
    currentOrientationRef.value = (event.currentTarget as HTMLElement).getAttribute(
      'data-orientation',
    ) as 'vertical' | 'horizontal';

    const viewportEl = viewportRef.value;
    if (viewportEl) {
      startScrollTopRef.value = viewportEl.scrollTop;
      startScrollLeftRef.value = viewportEl.scrollLeft;
      disableViewportSnap();
    }

    const thumb =
      currentOrientationRef.value === 'vertical' ? thumbYRef.value : thumbXRef.value;
    thumb?.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== activePointerIdRef.value) {
      return;
    }

    activePointerIdRef.value = null;
    (currentOrientationRef.value === 'vertical' ? scrollingY : scrollingX).value = false;

    if (savedSnapTypeRef.value !== null) {
      if (viewportRef.value) {
        viewportRef.value.style.scrollSnapType = savedSnapTypeRef.value;
      }
      savedSnapTypeRef.value = null;
    }

    const thumb =
      currentOrientationRef.value === 'vertical' ? thumbYRef.value : thumbXRef.value;
    if (thumb?.hasPointerCapture(event.pointerId)) {
      thumb.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activePointerIdRef.value) {
      return;
    }

    if (event.buttons % 2 === 0) {
      handlePointerUp(event);
      return;
    }

    const viewportEl = viewportRef.value;
    if (!viewportEl) {
      return;
    }

    const vertical = currentOrientationRef.value === 'vertical';
    const thumbEl = vertical ? thumbYRef.value : thumbXRef.value;
    const scrollbarEl = vertical ? scrollbarYRef.value : scrollbarXRef.value;
    if (!thumbEl || !scrollbarEl) {
      return;
    }

    const axis = vertical ? 'y' : 'x';
    const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
    const thumbOffset = getOffset(thumbEl, 'margin', axis);
    const thumbSizePx = vertical ? thumbEl.offsetHeight : thumbEl.offsetWidth;
    const trackSize = vertical ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;
    const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
    const delta = vertical ? event.clientY - startYRef.value : event.clientX - startXRef.value;
    const scrollRatio = maxThumbOffset <= 0 ? 0 : delta / maxThumbOffset;

    const scrollableSize = vertical ? viewportEl.scrollHeight : viewportEl.scrollWidth;
    const viewportSize = vertical ? viewportEl.clientHeight : viewportEl.clientWidth;
    const startScroll = vertical ? startScrollTopRef.value : startScrollLeftRef.value;
    const nextScroll = startScroll + scrollRatio * (scrollableSize - viewportSize);

    if (vertical) {
      viewportEl.scrollTop = nextScroll;
    } else {
      viewportEl.scrollLeft = nextScroll;
    }
    event.preventDefault();

    startScrolling(vertical);
  };

  function handleTouchModalityChange(event: PointerEvent) {
    touchModality.value = event.pointerType === 'touch';
  }

  function handlePointerEnterOrMove(event: PointerEvent) {
    handleTouchModalityChange(event);

    if (event.pointerType !== 'touch') {
      const isTargetRootChild = contains(rootRef.value, event.target as Element);
      hovering.value = isTargetRootChild;
    }
  }

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateValueFn = (): ScrollAreaRootState => ({
    scrolling: scrollingX.value || scrollingY.value,
    hasOverflowX: !hiddenState.value.x,
    hasOverflowY: !hiddenState.value.y,
    overflowXStart: overflowEdges.value.xStart,
    overflowXEnd: overflowEdges.value.xEnd,
    overflowYStart: overflowEdges.value.yStart,
    overflowYEnd: overflowEdges.value.yEnd,
    cornerHidden: hiddenState.value.corner,
  });

  const defaultProps = (): Record<string, any> => ({
    role: 'presentation',
    onPointerEnter: handlePointerEnterOrMove,
    onPointerMove: handlePointerEnterOrMove,
    onPointerDown: handleTouchModalityChange,
    onPointerLeave() {
      hovering.value = false;
    },
    style: {
      position: 'relative',
      ['--scroll-area-corner-height' as string]: `${cornerSize.value.height}px`,
      ['--scroll-area-corner-width' as string]: `${cornerSize.value.width}px`,
    },
  });

  const buildContextValue = (stateValue: ScrollAreaRootState): ScrollAreaRootContext => ({
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleScroll,
    disableViewportSnap,
    cornerSize: cornerSize.value,
    setCornerSize: (v: Size) => (cornerSize.value = v),
    thumbSize: thumbSize.value,
    setThumbSize: (v: Size) => (thumbSize.value = v),
    hasMeasuredScrollbar: hasMeasuredScrollbar.value,
    setHasMeasuredScrollbar: (v: boolean) => (hasMeasuredScrollbar.value = v),
    touchModality: touchModality.value,
    cornerRef,
    scrollingX: scrollingX.value,
    scrollingY: scrollingY.value,
    hovering: hovering.value,
    setHovering: (v: boolean) => (hovering.value = v),
    viewportRef,
    scrollbarYRef,
    scrollbarXRef,
    thumbYRef,
    thumbXRef,
    rootId,
    hiddenState: hiddenState.value,
    setHiddenState: (v: HiddenState) => (hiddenState.value = v),
    overflowEdges: overflowEdges.value,
    setOverflowEdges: (v: OverflowEdges) => (overflowEdges.value = v),
    viewportState: stateValue,
    overflowEdgeThreshold: {xStart, xEnd, yStart, yEnd},
  });

  const {element} = useRenderElement({
    props: () => {
      const stateValue = stateValueFn();
      const p = defaultProps();
      const merged: any = {};
      Object.assign(merged, p, {...unrefs(elementProps)});
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateValue) : style?.value;
      if (resolvedStyle !== undefined) {
        merged.style = Object.assign({}, p.style, resolvedStyle);
      }
      return [merged];
    },
    state: stateValueFn,
    stateAttributesMapping: scrollAreaStateAttributesMapping as any,
    className,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ScrollAreaRootContext.Provider value={buildContextValue(stateValueFn()) as any}>
      {!disableStyleElements && styleDisableScrollbar.getElement(nonce)}
      {element()}
    </ScrollAreaRootContext.Provider>
  );
}

export interface ScrollAreaRootState {
  /**
   * Whether a scroll gesture is currently in progress.
   */
  scrolling: boolean;
  /**
   * Whether there is horizontal overflow.
   */
  hasOverflowX: boolean;
  /**
   * Whether there is vertical overflow.
   */
  hasOverflowY: boolean;
  /**
   * Whether the start of the horizontal overflow is visible.
   */
  overflowXStart: boolean;
  /**
   * Whether the end of the horizontal overflow is visible.
   */
  overflowXEnd: boolean;
  /**
   * Whether the start of the vertical overflow is visible.
   */
  overflowYStart: boolean;
  /**
   * Whether the end of the vertical overflow is visible.
   */
  overflowYEnd: boolean;
  /**
   * Whether the corner is hidden.
   */
  cornerHidden: boolean;
}

export interface ScrollAreaRootProps extends BaseUIComponentProps<'div', ScrollAreaRootState> {
  /**
   * The amount (in pixels) the content can be overscrolled before the
   * overflow edge is considered reached. Pass a number to apply it to all
   * edges, or an object to configure each edge individually.
   * @default 0
   */
  overflowEdgeThreshold?:
    | number
    | Partial<{
        xStart: number;
        xEnd: number;
        yStart: number;
        yEnd: number;
      }>
    | undefined;
}

export namespace ScrollAreaRoot {
  export type State = ScrollAreaRootState;
  export type Props = ScrollAreaRootProps;
}

function normalizeOverflowEdgeThreshold(
  threshold: ScrollAreaRoot.Props['overflowEdgeThreshold'] | undefined,
) {
  const thresholds =
    typeof threshold === 'number'
      ? {xStart: threshold, xEnd: threshold, yStart: threshold, yEnd: threshold}
      : threshold;

  return {
    xStart: Math.max(0, thresholds?.xStart || 0),
    xEnd: Math.max(0, thresholds?.xEnd || 0),
    yStart: Math.max(0, thresholds?.yStart || 0),
    yEnd: Math.max(0, thresholds?.yEnd || 0),
  };
}

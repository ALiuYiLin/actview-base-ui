import { computed, ref, watch } from 'actview';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { contains } from '@base-ui/actview-utils/shadowDom';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { ScrollAreaRootContext } from '@/scroll-area/root/ScrollAreaRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { SCROLL_TIMEOUT } from '@/scroll-area/constants';
import { getOffset } from '@/scroll-area/utils/getOffset';
import { styleDisableScrollbar } from '@/utils/styles';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { scrollAreaStateAttributesMapping } from '@/scroll-area/root/stateAttributes';
import { useCSPContext } from '@/internals/csp-context/CspContext';

const DEFAULT_COORDS = { x: 0, y: 0 };
const DEFAULT_SIZE = { width: 0, height: 0 };
const DEFAULT_OVERFLOW_EDGES = { xStart: false, xEnd: false, yStart: false, yEnd: false };
const DEFAULT_HIDDEN_STATE = { x: true, y: true, corner: true };

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
  const rootId = useBaseUiId();

  const scrollYTimeout = useTimeout();
  const scrollXTimeout = useTimeout();

  const csp = useCSPContext();

  const hovering = ref(false);
  const scrollingX = ref(false);
  const scrollingY = ref(false);
  const touchModality = ref(false);
  const hasMeasuredScrollbar = ref(false);
  const cornerSize = ref<Size>(DEFAULT_SIZE);
  const thumbSize = ref<Size>(DEFAULT_SIZE);
  const overflowEdges = ref<OverflowEdges>(DEFAULT_OVERFLOW_EDGES);
  const hiddenState = ref<HiddenState>(DEFAULT_HIDDEN_STATE);

  const rootRef = { current: null as HTMLDivElement | null };
  const viewportRef = { current: null as HTMLDivElement | null };
  const scrollbarYRef = { current: null as HTMLDivElement | null };
  const scrollbarXRef = { current: null as HTMLDivElement | null };
  const thumbYRef = { current: null as HTMLDivElement | null };
  const thumbXRef = { current: null as HTMLDivElement | null };
  const cornerRef = { current: null as HTMLDivElement | null };

  const activePointerIdRef = { current: null as number | null };
  const startYRef = { current: 0 };
  const startXRef = { current: 0 };
  const startScrollTopRef = { current: 0 };
  const startScrollLeftRef = { current: 0 };
  const currentOrientationRef = { current: 'vertical' as 'vertical' | 'horizontal' };
  const scrollPositionRef = { current: DEFAULT_COORDS };
  const savedSnapTypeRef = { current: null as string | null };

  const setScrollingX = (value: boolean) => {
    scrollingX.value = value;
  };
  const setScrollingY = (value: boolean) => {
    scrollingY.value = value;
  };
  const setHovering = (value: boolean) => {
    hovering.value = value;
  };
  const setHasMeasuredScrollbar = (value: boolean) => {
    hasMeasuredScrollbar.value = value;
  };
  // Setters bail out when the value is unchanged (shallow-equal via `pickState` AND same
  // reference): assigning the same object to a ref still schedules a re-render in ActView,
  // and an unconditional assign on every measurement pass would create a render/watch loop
  // (see plantform-diff.md AD-14).
  const setCornerSize = (value: Size) => {
    const next = pickState(cornerSize.value, value);
    if (next !== cornerSize.value) {
      cornerSize.value = next;
    }
  };
  const setThumbSize = (value: Size) => {
    const next = pickState(thumbSize.value, value);
    if (next !== thumbSize.value) {
      thumbSize.value = next;
    }
  };
  const setHiddenState = (value: HiddenState) => {
    const next = pickState(hiddenState.value, value);
    if (next !== hiddenState.value) {
      hiddenState.value = next;
    }
  };
  const setOverflowEdges = (value: OverflowEdges) => {
    const next = pickState(overflowEdges.value, value);
    if (next !== overflowEdges.value) {
      overflowEdges.value = next;
    }
  };

  function startScrolling(vertical: boolean) {
    const setScrolling = vertical ? setScrollingY : setScrollingX;
    const timeout = vertical ? scrollYTimeout : scrollXTimeout;

    setScrolling(true);
    timeout.start(SCROLL_TIMEOUT, () => {
      setScrolling(false);
    });
  }

  function handleScroll(scrollPosition: Coords) {
    const offsetX = scrollPosition.x - scrollPositionRef.current.x;
    const offsetY = scrollPosition.y - scrollPositionRef.current.y;

    scrollPositionRef.current = scrollPosition;

    if (offsetY !== 0) {
      startScrolling(true);
    }

    if (offsetX !== 0) {
      startScrolling(false);
    }
  }

  // CSS scroll snap forces every programmatic scroll to land on a snap
  // point, making thumb dragging jump between snap points. Native
  // scrollbars suppress snapping while dragging, so disable it until the
  // pointer is released; restoring the value re-snaps the viewport. The
  // save is guarded so a second pointer during an active drag can't
  // clobber the saved value with `none`.
  function disableViewportSnap() {
    const viewportEl = viewportRef.current;
    if (viewportEl && savedSnapTypeRef.current === null) {
      savedSnapTypeRef.current = viewportEl.style.scrollSnapType;
      viewportEl.style.scrollSnapType = 'none';
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    if (activePointerIdRef.current !== null) {
      const activeThumb =
        currentOrientationRef.current === 'vertical' ? thumbYRef.current : thumbXRef.current;
      // A live drag holds capture for the active pointer — ignore other pointers.
      // No capture means the release went missing entirely (silent capture drop
      // with an id that never reappears, e.g. a lost touch contact), so let the
      // new pointer take over the latch instead of leaving dragging dead.
      if (activeThumb?.hasPointerCapture(activePointerIdRef.current)) {
        return;
      }
    }

    activePointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    startXRef.current = event.clientX;
    // Literal instead of `ScrollAreaScrollbarDataAttributes.orientation`: referencing an
    // enum member retains its whole object in the bundle, so the strings are inlined and
    // the enums kept for docs only.
    currentOrientationRef.current = (event.currentTarget as HTMLElement).getAttribute(
      'data-orientation',
    ) as 'vertical' | 'horizontal';

    const viewportEl = viewportRef.current;
    if (viewportEl) {
      startScrollTopRef.current = viewportEl.scrollTop;
      startScrollLeftRef.current = viewportEl.scrollLeft;
      disableViewportSnap();
    }

    const thumb =
      currentOrientationRef.current === 'vertical' ? thumbYRef.current : thumbXRef.current;
    thumb?.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent) {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    activePointerIdRef.current = null;
    // Clear the drag's scrolling state immediately rather than waiting for the
    // `SCROLL_TIMEOUT` timer armed by the last drag move, so every release path
    // (real, `pointercancel`, or the missed-release fallback) behaves the same.
    (currentOrientationRef.current === 'vertical' ? setScrollingY : setScrollingX)(false);

    if (savedSnapTypeRef.current !== null) {
      if (viewportRef.current) {
        viewportRef.current.style.scrollSnapType = savedSnapTypeRef.current;
      }
      savedSnapTypeRef.current = null;
    }

    const thumb =
      currentOrientationRef.current === 'vertical' ? thumbYRef.current : thumbXRef.current;
    // `pointercancel` releases capture implicitly, so guard against releasing a
    // capture we no longer hold (which would throw).
    if (thumb?.hasPointerCapture(event.pointerId)) {
      thumb.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    // The release can go missing entirely (e.g. the browser drops pointer
    // capture while the scrollbar is hidden mid-drag), leaving the drag
    // latched so a buttonless hover over the thumb scrolls the viewport.
    // Treat a move without the primary button held (`buttons` bit 1 unset)
    // as the missed release.
    if (event.buttons % 2 === 0) {
      handlePointerUp(event);
      return;
    }

    const viewportEl = viewportRef.current;
    if (!viewportEl) {
      return;
    }

    const vertical = currentOrientationRef.current === 'vertical';
    const thumbEl = vertical ? thumbYRef.current : thumbXRef.current;
    const scrollbarEl = vertical ? scrollbarYRef.current : scrollbarXRef.current;
    if (!thumbEl || !scrollbarEl) {
      return;
    }

    const axis = vertical ? 'y' : 'x';
    const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
    const thumbOffset = getOffset(thumbEl, 'margin', axis);
    const thumbSizePx = vertical ? thumbEl.offsetHeight : thumbEl.offsetWidth;
    const trackSize = vertical ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;
    const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
    // A short or heavily padded track can drive `maxThumbOffset` to zero or
    // negative once the thumb hits its `MIN_THUMB_SIZE` floor. Dividing by it
    // would yield a non-finite (`Infinity`/`NaN`) or inverted scroll position.
    const delta = vertical ? event.clientY - startYRef.current : event.clientX - startXRef.current;
    const scrollRatio = maxThumbOffset <= 0 ? 0 : delta / maxThumbOffset;

    const scrollableSize = vertical ? viewportEl.scrollHeight : viewportEl.scrollWidth;
    const viewportSize = vertical ? viewportEl.clientHeight : viewportEl.clientWidth;
    const startScroll = vertical ? startScrollTopRef.current : startScrollLeftRef.current;
    const nextScroll = startScroll + scrollRatio * (scrollableSize - viewportSize);

    if (vertical) {
      viewportEl.scrollTop = nextScroll;
    } else {
      viewportEl.scrollLeft = nextScroll;
    }
    event.preventDefault();

    startScrolling(vertical);
  }

  function handleTouchModalityChange(event: PointerEvent) {
    touchModality.value = event.pointerType === 'touch';
  }

  function handlePointerEnterOrMove(event: PointerEvent) {
    handleTouchModalityChange(event);

    if (event.pointerType !== 'touch') {
      const isTargetRootChild = contains(rootRef.current, event.target as Element);
      setHovering(isTargetRootChild);
    }
  }

  const overflowEdgeThreshold = computed(() =>
    normalizeOverflowEdgeThreshold(componentProps.overflowEdgeThreshold),
  );

  const state = computed<ScrollAreaRootState>(() => ({
    scrolling: scrollingX.value || scrollingY.value,
    hasOverflowX: !hiddenState.value.x,
    hasOverflowY: !hiddenState.value.y,
    overflowXStart: overflowEdges.value.xStart,
    overflowXEnd: overflowEdges.value.xEnd,
    overflowYStart: overflowEdges.value.yStart,
    overflowYEnd: overflowEdges.value.yEnd,
    cornerHidden: hiddenState.value.corner,
  }));

  const getRootProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    role: 'presentation',
    onPointerEnter: handlePointerEnterOrMove,
    onPointerMove: handlePointerEnterOrMove,
    onPointerDown: handleTouchModalityChange,
    onPointerLeave() {
      setHovering(false);
    },
    style: {
      position: 'relative',
    },
  });

  // ActView's object `style` rendering drops `--*` custom property keys (plantform-diff.md
  // PD-25), so the corner size variables are applied imperatively instead. The scrollbar
  // styles reference them through `var(...)` values, which render normally.
  const applyCornerVars = () => {
    const rootEl = rootRef.current;
    if (!rootEl) {
      return;
    }
    rootEl.style.setProperty('--scroll-area-corner-height', `${cornerSize.value.height}px`);
    rootEl.style.setProperty('--scroll-area-corner-width', `${cornerSize.value.width}px`);
  };

  useIsoLayoutEffect(() => {
    applyCornerVars();
  });

  watch(cornerSize, () => {
    applyCornerVars();
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      overflowEdgeThreshold: _overflowEdgeThreshold,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, rootRef],
    props: [getRootProps, getElementProps],
    stateAttributesMapping: scrollAreaStateAttributesMapping,
  });

  const contextValue = computed<ScrollAreaRootContext>(() => ({
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleScroll,
    disableViewportSnap,
    cornerSize: cornerSize.value,
    setCornerSize,
    thumbSize: thumbSize.value,
    setThumbSize,
    hasMeasuredScrollbar: hasMeasuredScrollbar.value,
    setHasMeasuredScrollbar,
    touchModality: touchModality.value,
    cornerRef,
    scrollingX: scrollingX.value,
    scrollingY: scrollingY.value,
    hovering: hovering.value,
    setHovering,
    viewportRef,
    scrollbarYRef,
    scrollbarXRef,
    thumbYRef,
    thumbXRef,
    rootId,
    hiddenState: hiddenState.value,
    setHiddenState,
    overflowEdges: overflowEdges.value,
    setOverflowEdges,
    viewportState: state.value,
    overflowEdgeThreshold: {
      xStart: overflowEdgeThreshold.value.xStart,
      xEnd: overflowEdgeThreshold.value.xEnd,
      yStart: overflowEdgeThreshold.value.yStart,
      yEnd: overflowEdgeThreshold.value.yEnd,
    },
  }));

  return (
    <ScrollAreaRootContext.Provider value={contextValue}>
      {!csp.value.disableStyleElements && styleDisableScrollbar.getElement(csp.value.nonce)}
      {getElement()}
    </ScrollAreaRootContext.Provider>
  );
}

export interface ScrollAreaRootState {
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * Whether horizontal overflow is present.
   */
  hasOverflowX: boolean;
  /**
   * Whether vertical overflow is present.
   */
  hasOverflowY: boolean;
  /**
   * Whether there is overflow on the inline start side for the horizontal axis.
   */
  overflowXStart: boolean;
  /**
   * Whether there is overflow on the inline end side for the horizontal axis.
   */
  overflowXEnd: boolean;
  /**
   * Whether there is overflow on the block start side.
   */
  overflowYStart: boolean;
  /**
   * Whether there is overflow on the block end side.
   */
  overflowYEnd: boolean;
  /**
   * Whether the scrollbar corner is hidden.
   */
  cornerHidden: boolean;
}

export interface ScrollAreaRootProps extends BaseUIComponentProps<'div', ScrollAreaRootState> {
  /**
   * The threshold in pixels that must be passed before the overflow edge attributes are applied.
   * Accepts a single number for all edges or an object to configure them individually.
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
      ? { xStart: threshold, xEnd: threshold, yStart: threshold, yEnd: threshold }
      : threshold;

  return {
    xStart: Math.max(0, thresholds?.xStart || 0),
    xEnd: Math.max(0, thresholds?.xEnd || 0),
    yStart: Math.max(0, thresholds?.yStart || 0),
    yEnd: Math.max(0, thresholds?.yEnd || 0),
  };
}

/**
 * Returns `prev` when `next` is shallow-equal to it so state updates bail out and
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

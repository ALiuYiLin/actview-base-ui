import {computed, onMounted, onUnmounted, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { getOffset } from '../utils/getOffset';
import { contains, getTarget } from '@/utils/shadowDom';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import type { ScrollAreaRootState } from '../root/ScrollAreaRoot';
import { ScrollAreaScrollbarContext } from './ScrollAreaScrollbarContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A vertical or horizontal scrollbar for the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaScrollbar(componentProps: ScrollAreaScrollbar.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElement）。
  const scrollbarRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useScrollAreaRootContext();

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const orientation = computed(() => componentProps.orientation ?? 'vertical');
  const keepMounted = computed(() => componentProps.keepMounted ?? false);
  const vertical = computed(() => orientation.value === 'vertical');

  const direction = useDirection();

  const hideTrackUntilMeasured = computed(
    () => !rootContext.hasMeasuredScrollbar && !keepMounted.value,
  );
  const isHidden = computed(() =>
    vertical.value ? rootContext.hiddenState.y : rootContext.hiddenState.x,
  );
  const shouldRender = computed(() => keepMounted.value || !isHidden.value);

  // React 版 useEffect：wheel 事件（捕获到 scrollbar 元素上）
  let wheelCleanup: (() => void) | undefined;
  const setupWheel = () => {
    wheelCleanup?.();
    wheelCleanup = undefined;

    if (!shouldRender.value) {
      return;
    }

    const viewportEl = rootContext.viewportRef.value;
    const scrollbarEl = scrollbarRef.value;

    if (!scrollbarEl) {
      return;
    }

    function handleWheel(event: WheelEvent) {
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

      rootContext.handleScroll({x: viewportEl.scrollLeft, y: viewportEl.scrollTop});
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

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  const handleTrackPointerDown = (event: any) => {
    if (event.button !== 0) {
      return;
    }

    const target = getTarget(event.nativeEvent ?? event) as Element | null;
    const thumbEl = vertical.value ? rootContext.thumbYRef.value : rootContext.thumbXRef.value;

    // Ignore clicks on thumb, including cases where React retargets the
    // synthetic event to the track host across a shadow boundary.
    if (thumbEl && contains(thumbEl, target)) {
      return;
    }

    const viewportEl = rootContext.viewportRef.value;
    if (!viewportEl) {
      return;
    }

    const scrollbarEl = scrollbarRef.value;

    if (!thumbEl || !scrollbarEl) {
      return;
    }

    const isVertical = vertical.value;
    const axis = isVertical ? 'y' : 'x';
    const thumbOffset = getOffset(thumbEl, 'margin', axis);
    const scrollbarOffset = getOffset(scrollbarEl, 'padding', axis);
    const thumbSizePx = isVertical ? thumbEl.offsetHeight : thumbEl.offsetWidth;
    const trackRect = scrollbarEl.getBoundingClientRect();
    const clickPosition = isVertical
      ? event.clientY - trackRect.top - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2
      : event.clientX - trackRect.left - thumbSizePx / 2 - scrollbarOffset + thumbOffset / 2;

    const scrollableSize = isVertical ? viewportEl.scrollHeight : viewportEl.scrollWidth;
    const viewportSize = isVertical ? viewportEl.clientHeight : viewportEl.clientWidth;
    const trackSize = isVertical ? scrollbarEl.offsetHeight : scrollbarEl.offsetWidth;

    const maxThumbOffset = trackSize - thumbSizePx - scrollbarOffset - thumbOffset;
    // A short or heavily padded track can drive `maxThumbOffset` to zero or
    // negative once the thumb hits its `MIN_THUMB_SIZE` floor.
    if (maxThumbOffset <= 0) {
      return;
    }

    const scrollRatio = clickPosition / maxThumbOffset;
    const maxScrollDistance = scrollableSize - viewportSize;

    // Disable snapping before the jump-to-click assignment.
    rootContext.disableViewportSnap();

    if (isVertical) {
      viewportEl.scrollTop = scrollRatio * maxScrollDistance;
    } else if (direction.value === 'rtl') {
      viewportEl.scrollLeft = -(1 - scrollRatio) * maxScrollDistance;
    } else {
      viewportEl.scrollLeft = scrollRatio * maxScrollDistance;
    }

    rootContext.handleScroll({x: viewportEl.scrollLeft, y: viewportEl.scrollTop});

    rootContext.handlePointerDown(event);
  };

  const handleMouseDown = (event: any) => {
    // Native scrollbars don't move focus when pressed, whichever button is used.
    // Handled here rather than on the thumb so the bubbled press covers both.
    event.preventDefault();
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<ScrollAreaScrollbarState>(() => ({
    ...rootContext.viewportState,
    hovering: rootContext.hovering,
    scrolling: vertical.value ? rootContext.scrollingY : rootContext.scrollingX,
    orientation: orientation.value,
  }));

  const rootProps = computed<Record<string, any>>(() => ({
    ...(rootContext.rootId && {'data-id': `${rootContext.rootId}-scrollbar`}),
    onPointerDown: handleTrackPointerDown,
    onMouseDown: handleMouseDown,
    onPointerUp: rootContext.handlePointerUp,
    // Mirror `onPointerUp` so a browser-cancelled gesture on the track still
    // clears the drag state.
    onPointerCancel: rootContext.handlePointerUp,
    style: {
      position: 'absolute',
      touchAction: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      visibility: hideTrackUntilMeasured.value ? 'hidden' : undefined,
      ...(vertical.value
        ? {
            top: 0,
            bottom: 'var(--scroll-area-corner-height)',
            insetInlineEnd: 0,
            ['--scroll-area-thumb-height' as string]: `${rootContext.thumbSize.height}px`,
          }
        : {
            insetInlineStart: 0,
            insetInlineEnd: 'var(--scroll-area-corner-width)',
            bottom: 0,
            ['--scroll-area-thumb-width' as string]: `${rootContext.thumbSize.width}px`,
          }),
    },
  }));

  // store-as-is 载体：orientation 经 getter 渲染期求值。
  const scrollbarContextValue = {
    get orientation() {
      return orientation.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <ScrollAreaScrollbarContext.Provider value={scrollbarContextValue}>
      {shouldRender.value
        ? useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              stateAttributesMapping: scrollAreaStateAttributesMapping,
              ref: useMergedRefs(scrollbarRef, componentProps.ref as any),
              props: [rootProps.value, elementProps.value],
            },
          )
        : null}
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

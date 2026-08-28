import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaScrollbarContext } from '../scrollbar/ScrollAreaScrollbarContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * The thumb of the scrollbar, used for dragging.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaThumb(componentProps: ScrollAreaThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const thumbRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useScrollAreaRootContext();
  const scrollbarContext = useScrollAreaScrollbarContext();

  const vertical = computed(() => scrollbarContext.orientation === 'vertical');

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

  const state = computed<ScrollAreaThumbState>(() => ({
    scrolling: vertical.value
      ? rootContext.scrollingY
      : rootContext.scrollingX,
    orientation: scrollbarContext.orientation,
  }));

  const rootProps = computed<Record<string, any>>(() => ({
    onPointerDown: rootContext.handlePointerDown,
    onPointerMove: rootContext.handlePointerMove,
    onPointerUp: rootContext.handlePointerUp,
    onPointerCancel: rootContext.handlePointerUp,
    style: {
      visibility: rootContext.hasMeasuredScrollbar ? undefined : 'hidden',
      ...(vertical.value
        ? {height: 'var(--scroll-area-thumb-height)'}
        : {width: 'var(--scroll-area-thumb-width)'}),
    },
    ...elementProps.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: scrollAreaStateAttributesMapping,
          ref: useMergedRefs(thumbRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface ScrollAreaThumbState {
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * The orientation of the scrollbar.
   */
  orientation: 'vertical' | 'horizontal';
}

export interface ScrollAreaThumbProps extends BaseUIComponentProps<'div', ScrollAreaThumbState> {}

export namespace ScrollAreaThumb {
  export type State = ScrollAreaThumbState;
  export type Props = ScrollAreaThumbProps;
}

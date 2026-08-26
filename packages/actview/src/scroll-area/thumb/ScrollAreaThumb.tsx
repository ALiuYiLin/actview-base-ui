import { toValue, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaScrollbarContext } from '../scrollbar/ScrollAreaScrollbarContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * The thumb of the scrollbar, used for dragging.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaThumb(componentProps: ScrollAreaThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootContextRef = useScrollAreaRootContext();
  const thumbRef = useRootElementFragment();

  const scrollbarOrientationRef = useScrollAreaScrollbarContext();
  const vertical = () => scrollbarOrientationRef.value === 'vertical';

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): ScrollAreaThumbState => {
    const {scrollingX, scrollingY} = rootContextRef.value;
    return {
      scrolling: vertical() ? scrollingY : scrollingX,
      orientation: scrollbarOrientationRef.value,
    };
  };

  const {element} = useRenderElement({
    props: () => {
      const {handlePointerDown, handlePointerMove, handlePointerUp, hasMeasuredScrollbar} =
        rootContextRef.value;

      const isVertical = vertical();

      const p: Record<string, any> = {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        ...({onPointerCancel: handlePointerUp} as any),
        style: {
          visibility: hasMeasuredScrollbar ? undefined : 'hidden',
          ...(isVertical
            ? {height: 'var(--scroll-area-thumb-height)'}
            : {width: 'var(--scroll-area-thumb-width)'}),
        },
      };

      const merged: any = {};
      Object.assign(merged, p, {...unrefs(elementProps)});
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateFn()) : style?.value;
      if (resolvedStyle !== undefined) {
        merged.style = Object.assign({}, p.style, resolvedStyle);
      }
      return [merged];
    },
    state: stateFn,
    stateAttributesMapping: scrollAreaStateAttributesMapping as any,
    className,
    render,
    refs: () => [thumbRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
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

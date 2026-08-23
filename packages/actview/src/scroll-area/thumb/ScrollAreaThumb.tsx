import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaScrollbarContext } from '../scrollbar/ScrollAreaScrollbarContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

/**
 * The thumb of the scrollbar, used for dragging.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export const ScrollAreaThumb = defineComponent(function (componentProps: ScrollAreaThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useScrollAreaRootContext();
  const thumbRef = useRootElement();

  const scrollbarOrientationRef = useScrollAreaScrollbarContext();
  const vertical = () => scrollbarOrientationRef.value === 'vertical';

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      scrollingX,
      scrollingY,
      hasMeasuredScrollbar,
    } = rootContextRef.value;

    const isVertical = vertical();

    const stateValue: ScrollAreaThumbState = {
      scrolling: isVertical ? scrollingY : scrollingX,
      orientation: scrollbarOrientationRef.value,
    };

    const stateAttributes = getStateAttributesProps(stateValue, scrollAreaStateAttributesMapping);

    const props: HTMLProps = {
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

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: thumbRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={thumbRef} />;
    }
    return <div {...merged} ref={thumbRef} />;
  };
}) as unknown as (props: ScrollAreaThumb.Props) => JSX.Element;

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

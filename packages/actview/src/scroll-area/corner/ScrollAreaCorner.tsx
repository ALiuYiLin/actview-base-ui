import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';

/**
 * The corner of the scroll area, where the two scrollbars meet.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export const ScrollAreaCorner = defineComponent(function (componentProps: ScrollAreaCorner.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useScrollAreaRootContext();
  const cornerRef = useRootElement();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {cornerSize, hiddenState} = rootContextRef.value;

    const merged: any = {
      ...elementProps,
      style: {
        position: 'absolute',
        bottom: 0,
        insetInlineEnd: 0,
        width: cornerSize.width,
        height: cornerSize.height,
      },
      ref: cornerRef,
    };
    if (typeof className === 'function') {
      merged.className = className({});
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, merged.style, style({}) as any);
    } else if (style !== undefined) {
      merged.style = Object.assign({}, merged.style, style);
    }

    if (hiddenState.corner) {
      return null;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref: cornerRef} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={cornerRef} />;
    }
    return <div {...merged}>{componentProps.children}</div>;
  };
}) as unknown as (props: ScrollAreaCorner.Props) => JSX.Element;

export interface ScrollAreaCornerState {}

export interface ScrollAreaCornerProps extends BaseUIComponentProps<'div', ScrollAreaCornerState> {}

export namespace ScrollAreaCorner {
  export type State = ScrollAreaCornerState;
  export type Props = ScrollAreaCornerProps;
}

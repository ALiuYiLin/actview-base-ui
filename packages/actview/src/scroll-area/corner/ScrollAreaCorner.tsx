import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A small rectangular area that appears at the intersection of horizontal and vertical scrollbars.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaCorner(componentProps: ScrollAreaCorner.Props) {
  const root = useScrollAreaRootContext();

  const getCornerProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    style: {
      position: 'absolute',
      bottom: 0,
      insetInlineEnd: 0,
      width: `${root.value.cornerSize.width}px`,
      height: `${root.value.cornerSize.height}px`,
    },
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, root.value.cornerRef],
    props: [getCornerProps, getElementProps],
  });

  return <>{root.value.hiddenState.corner ? null : getElement()}</>;
}

export interface ScrollAreaCornerState {}

export interface ScrollAreaCornerProps extends BaseUIComponentProps<'div', ScrollAreaCornerState> {}

export namespace ScrollAreaCorner {
  export type State = ScrollAreaCornerState;
  export type Props = ScrollAreaCornerProps;
}

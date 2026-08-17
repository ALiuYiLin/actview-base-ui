import { computed } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaScrollbarContext } from '../scrollbar/ScrollAreaScrollbarContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * The draggable part of the scrollbar that indicates the current scroll position.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaThumb(componentProps: ScrollAreaThumb.Props) {
  const root = useScrollAreaRootContext();
  const scrollbarContext = useScrollAreaScrollbarContext();

  const vertical = computed(() => scrollbarContext.value === 'vertical');

  const state = computed<ScrollAreaThumbState>(() => ({
    scrolling: vertical.value ? root.value.scrollingY : root.value.scrollingX,
    orientation: scrollbarContext.value,
  }));

  // The thumb is mounted inside a conditional scrollbar; pick the Y/X ref at attach time.
  const thumbRef = (node: HTMLDivElement | null) => {
    if (vertical.value) {
      root.value.thumbYRef.current = node;
    } else {
      root.value.thumbXRef.current = node;
    }
  };

  const getThumbProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    onPointerDown: root.value.handlePointerDown,
    onPointerMove: root.value.handlePointerMove,
    onPointerUp: root.value.handlePointerUp,
    onPointerCancel: root.value.handlePointerUp,
    style: {
      ...(root.value.hasMeasuredScrollbar ? null : { visibility: 'hidden' }),
      ...(vertical.value
        ? { height: 'var(--scroll-area-thumb-height)' }
        : { width: 'var(--scroll-area-thumb-width)' }),
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
    ref: [componentProps.ref, thumbRef],
    state,
    props: [getThumbProps, getElementProps],
  });

  return <>{getElement()}</>;
}

export interface ScrollAreaThumbState {
  /**
   * Whether the scroll area is being scrolled.
   */
  scrolling: boolean;
  /**
   * The component orientation.
   */
  orientation: 'horizontal' | 'vertical';
}

export interface ScrollAreaThumbProps extends BaseUIComponentProps<'div', ScrollAreaThumbState> {}

export namespace ScrollAreaThumb {
  export type State = ScrollAreaThumbState;
  export type Props = ScrollAreaThumbProps;
}

import { computed } from 'actview';
import { useToastPositionerContext } from '../positioner/ToastPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Displays an element positioned against the toast anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastArrow(componentProps: ToastArrow.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const { arrowRef, side, align, arrowUncentered, arrowStyles } =
    useToastPositionerContext().value!;

  const state = computed<ToastArrowState>(() => ({
    side: side.value,
    align: align.value,
    uncentered: arrowUncentered.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, arrowRef],
    props: [
      (prev: any) => ({ ...prev, style: arrowStyles.value, 'aria-hidden': true }),
      elementProps,
    ],
  });

  return <>{getElement()}</>;
}

export interface ToastArrowState {
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the arrow cannot be centered on the anchor.
   */
  uncentered: boolean;
}

export interface ToastArrowProps extends BaseUIComponentProps<'div', ToastArrowState> {}

export namespace ToastArrow {
  export type State = ToastArrowState;
  export type Props = ToastArrowProps;
}

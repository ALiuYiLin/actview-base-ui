import { computed } from 'actview';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Displays an element positioned against the popover anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverArrow(componentProps: PopoverArrow.Props) {
  const { render: _render, className: _className, style: _style, ...elementProps } = componentProps;

  const store = usePopoverRootContext().value!;
  const open = store.useState('open');
  const positioner = usePopoverPositionerContext();

  const state = computed<PopoverArrowState>(() => ({
    open: open.value,
    side: positioner.value.side,
    align: positioner.value.align,
    uncentered: positioner.value.arrowUncentered,
  }));

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, positioner.value.arrowRef],
    props: [
      () => ({ style: positioner.value.arrowStyles, 'aria-hidden': true }),
      elementProps,
    ],
    stateAttributesMapping: popupStateMapping,
  });

  return <>{element()}</>;
}

export interface PopoverArrowState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
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

export interface PopoverArrowProps extends BaseUIComponentProps<'div', PopoverArrowState> {}

export namespace PopoverArrow {
  export type State = PopoverArrowState;
  export type Props = PopoverArrowProps;
}

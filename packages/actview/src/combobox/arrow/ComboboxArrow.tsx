import { computed } from 'actview';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupStateMapping } from '../../utils/popupStateMapping';

/**
 * Displays an element positioned against the anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxArrow(componentProps: ComboboxArrow.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();
  const positioning = useComboboxPositionerContext();
  const { arrowRef, side, align, arrowUncentered, arrowStyles } = positioning.value;

  const open = store.useState('open');

  const state = computed<ComboboxArrowState>(() => ({
    open: open.value,
    side: side.value,
    align: align.value,
    uncentered: arrowUncentered.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: [arrowRef, componentProps.ref],
    stateAttributesMapping: popupStateMapping,
    state,
    props: {
      style: arrowStyles.value,
      'aria-hidden': true,
      ...elementProps,
    },
  });

  return <>{getElement()}</>;
}

export interface ComboboxArrowState {
  /**
   * Whether the popup is currently open.
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

export interface ComboboxArrowProps extends BaseUIComponentProps<'div', ComboboxArrowState> {}

export namespace ComboboxArrow {
  export type State = ComboboxArrowState;
  export type Props = ComboboxArrowProps;
}

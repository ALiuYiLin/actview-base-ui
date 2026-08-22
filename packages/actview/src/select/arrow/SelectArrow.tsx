import { computed } from 'actview';
import { useSelectPositionerContext } from '@/select/positioner/SelectPositionerContext';
import { useSelectRootContext } from '@/select/root/SelectRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { Align, Side } from '@/internals/useAnchorPositioning';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { selectors } from '@/select/store';

/**
 * Displays an element positioned against the select popup anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectArrow(componentProps: SelectArrow.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const { store } = rootContext;
  const positionerContext = useSelectPositionerContext().value;
  const { side, align, arrowRef, arrowStyles, arrowUncentered, alignItemWithTriggerActive } =
    positionerContext;

  const open = store.useState('open');

  const state = computed<SelectArrowState>(() => ({
    open: open.value,
    side: side.value,
    align: align.value,
    uncentered: arrowUncentered.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [arrowRef, componentProps.ref],
    props: [
      (prev: any) => ({ ...prev, style: arrowStyles.value, 'aria-hidden': true }),
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });

  // `alignItemWithTriggerActive` is reactive; the arrow must hide when the popup overlaps the
  // trigger. Setup-time snapshots would freeze the branch, so evaluate it in JSX (AD-29-style).
  return <>{alignItemWithTriggerActive ? null : getElement()}</>;
}

export interface SelectArrowState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side | 'none';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the arrow cannot be centered on the anchor.
   */
  uncentered: boolean;
}

export interface SelectArrowProps extends BaseUIComponentProps<'div', SelectArrowState> {}

export namespace SelectArrow {
  export type State = SelectArrowState;
  export type Props = SelectArrowProps;
}

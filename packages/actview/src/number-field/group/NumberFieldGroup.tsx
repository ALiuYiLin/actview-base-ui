import { computed } from 'actview';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups the input with the increment and decrement buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldGroup(componentProps: NumberFieldGroup.Props) {
  const rootContext = useNumberFieldRootContext();

  const state = computed(() => rootContext.value.state);

  function getElementProps(prev: HTMLProps): HTMLProps {
    const { render: _render, className: _className, style: _style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  }

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    state,
    props: [{ role: 'group' }, getElementProps],
    stateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface NumberFieldGroupState extends NumberFieldRootState {}

export interface NumberFieldGroupProps extends BaseUIComponentProps<'div', NumberFieldGroupState> {}

export namespace NumberFieldGroup {
  export type State = NumberFieldGroupState;
  export type Props = NumberFieldGroupProps;
}

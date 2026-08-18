import { computed } from 'actview';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFieldsetRootContext } from '../root/FieldsetRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';

/**
 * An accessible label that is automatically associated with the fieldset.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetLegend(componentProps: FieldsetLegend.Props) {
  const rootContext = useFieldsetRootContext();

  const setLegendId = rootContext.value.setLegendId;

  const id = useRegisteredLabelId(componentProps.id, setLegendId);

  const state = computed<FieldsetLegendState>(() => ({
    disabled: rootContext.value.disabled,
  }));

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      style: _style,
      id: _idProp,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [() => ({ id }), getElementProps],
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

export interface FieldsetLegendState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetLegendProps extends BaseUIComponentProps<'div', FieldsetLegendState> {}

export namespace FieldsetLegend {
  export type State = FieldsetLegendState;
  export type Props = FieldsetLegendProps;
}

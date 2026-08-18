import { watch } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useComboboxGroupContext } from '../group/ComboboxGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxGroupLabel(componentProps: ComboboxGroupLabel.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    id: idProp,
    ...elementProps
  } = componentProps;

  const { setLabelId } = useComboboxGroupContext().value;

  const id = useBaseUiId(idProp);

  watch(
    () => id,
    () => {
      setLabelId(id);
      return () => {
        setLabelId((currentId) => (currentId === id ? undefined : currentId));
      };
    },
    { immediate: true },
  );

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [(prev: any) => ({ ...prev, id }), elementProps],
  });

  return <>{getElement()}</>;
}

export interface ComboboxGroupLabelState {}

export interface ComboboxGroupLabelProps extends BaseUIComponentProps<
  'div',
  ComboboxGroupLabelState
> {}

export namespace ComboboxGroupLabel {
  export type State = ComboboxGroupLabelState;
  export type Props = ComboboxGroupLabelProps;
}

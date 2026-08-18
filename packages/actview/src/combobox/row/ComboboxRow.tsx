import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ComboboxRowContext } from './ComboboxRowContext';

/**
 * Displays a single row of items in a grid list.
 * Enable `grid` on the root component to turn the listbox into a grid.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxRow(componentProps: ComboboxRow.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [(prev: any) => ({ ...prev, role: 'row' }), elementProps],
  });

  return <ComboboxRowContext.Provider value>{getElement()}</ComboboxRowContext.Provider>;
}

export interface ComboboxRowState {}

export interface ComboboxRowProps extends BaseUIComponentProps<'div', ComboboxRowState> {}

export namespace ComboboxRow {
  export type State = ComboboxRowState;
  export type Props = ComboboxRowProps;
}

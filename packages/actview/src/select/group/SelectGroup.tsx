import { computed, ref } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { SelectGroupContext } from './SelectGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups related select items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectGroup(componentProps: SelectGroup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const labelId = ref<string | undefined>(undefined);
  const setLabelId: SelectGroupContext['setLabelId'] = (id) => {
    labelId.value = typeof id === 'function' ? id(labelId.value) : id;
  };  const contextValue = computed<SelectGroupContext>(() => ({
    labelId: labelId.value,
    setLabelId,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [
      (prev: any) => ({ ...prev, role: 'group', 'aria-labelledby': labelId.value }),
      elementProps,
    ],
  });

  return <SelectGroupContext.Provider value={contextValue}>{getElement()}</SelectGroupContext.Provider>;
}

export interface SelectGroupState {}

export interface SelectGroupProps extends BaseUIComponentProps<'div', SelectGroupState> {}

export namespace SelectGroup {
  export type State = SelectGroupState;
  export type Props = SelectGroupProps;
}

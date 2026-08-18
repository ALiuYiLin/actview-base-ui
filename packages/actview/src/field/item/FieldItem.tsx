import { computed } from 'actview';
import { type FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { FieldItemContext } from './FieldItemContext';
import { LabelableProvider } from '../../internals/labelable-provider';

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldItem(componentProps: FieldItem.Props) {
  const fieldRootContext = useFieldRootContext(false);

  const state = computed<FieldItemState>(() => ({
    ...fieldRootContext.value.state,
    disabled: (fieldRootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  }));

  const fieldItemContext = computed<FieldItemContext>(() => ({
    disabled: state.value.disabled,
  }));

  function getElementProps(prev: HTMLProps) {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  }

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    state,
    props: [getElementProps],
    stateAttributesMapping: fieldValidityMapping,
  });

  return (
    <LabelableProvider>
      <FieldItemContext.Provider value={fieldItemContext}>{getElement()}</FieldItemContext.Provider>
    </LabelableProvider>
  );
}

export interface FieldItemState extends FieldRootState {}

export interface FieldItemProps extends BaseUIComponentProps<'div', FieldItemState> {
  /**
   * Whether the wrapped control should ignore user interaction.
   * The `disabled` prop on `<Field.Root>` takes precedence over this.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace FieldItem {
  export type State = FieldItemState;
  export type Props = FieldItemProps;
}

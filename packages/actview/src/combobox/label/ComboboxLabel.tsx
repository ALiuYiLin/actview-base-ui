import { error } from '@base-ui/actview-utils/error';
import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import { useLabel } from '../../internals/labelable-provider/useLabel';
import { getDefaultLabelId } from '../../utils/resolveAriaLabelledBy';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * An accessible label that is automatically associated with the combobox trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxLabel(componentProps: ComboboxLabel.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;
  // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
  const elementPropsWithoutId = elementProps as typeof elementProps & { id?: string | undefined };
  delete elementPropsWithoutId.id;

  const fieldRootContext = useFieldRootContext();
  const store = useComboboxRootContext();

  const inputInsidePopup = store.useState('inputInsidePopup');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const rootId = store.useState('id');
  const defaultLabelId = computed(() => getDefaultLabelId(rootId.value));

  const localControlId = computed(() =>
    triggerElement.value?.id ?? (inputInsidePopup.value ? rootId.value : undefined),
  );

  const labelProps = useLabel({
    id: defaultLabelId.value,
    fallbackControlId: localControlId.value,
    setLabelId(nextLabelId: string | undefined) {
      store.set('labelId', nextLabelId);
    },
  });

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    state: computed(() => fieldRootContext.value.state),
    props: [labelProps(), elementPropsWithoutId],
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{getElement()}</>;
}

export interface ComboboxLabelState extends FieldRoot.State {}export interface ComboboxLabelProps extends Omit<
  BaseUIComponentProps<'div', ComboboxLabelState>,
  'id'
> {}

export namespace ComboboxLabel {
  export type State = ComboboxLabelState;
  export type Props = ComboboxLabelProps;
}

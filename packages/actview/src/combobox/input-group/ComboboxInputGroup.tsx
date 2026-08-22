import { computed } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import type { FieldRoot } from '@/field/root/FieldRoot';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import type { Side } from '@/internals/useAnchorPositioning';
import { triggerStateAttributesMapping } from '@/combobox/utils/stateAttributesMapping';
import { handleInputPress } from '@/combobox/utils/handleInputPress';
import { useListEmpty, usePopupSide } from '@/combobox/utils/parts';
import { contains } from '@/floating-ui-actview/utils/element';

/**
 * A wrapper for the input and its associated controls.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxInputGroup(componentProps: ComboboxInputGroup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const fieldRootContext = useFieldRootContext();
  const store = useComboboxRootContext();

  const open = store.useState('open');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const hasSelectedValue = store.useState('hasSelectedValue');
  const selectionMode = store.useState('selectionMode');

  const popupSide = usePopupSide(store);
  const disabled = computed(() => comboboxDisabled.value);
  const listEmpty = useListEmpty();
  const placeholder = computed(() =>
    selectionMode.value === 'none' ? false : !hasSelectedValue.value,
  );

  const state = computed<ComboboxInputGroup.State>(() => ({
    ...fieldRootContext.value.state,
    open: open.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    popupSide: popupSide.value,
    listEmpty: listEmpty.value,
    placeholder: placeholder.value,
  }));

  const setInputGroupElement = store.useStateSetter('inputGroupElement');

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, setInputGroupElement],
    props: [
      {
        role: 'group',
        onMouseDown(event: MouseEvent) {
          handleInputPress(event, store, disabled.value, readOnly.value, (target) => {
            return contains(store.state.chipsContainerRef.current, target);
          });
        },
      },
      elementProps,
    ],
    state,
    stateAttributesMapping: triggerStateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface ComboboxInputGroupState extends FieldRoot.State {
  /**
   * Whether the corresponding popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component should ignore user edits.
   */
  readOnly: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the combobox doesn't have a value.
   */
  placeholder: boolean;
}

export interface ComboboxInputGroupProps extends BaseUIComponentProps<
  'div',
  ComboboxInputGroup.State
> {}

export namespace ComboboxInputGroup {
  export type State = ComboboxInputGroupState;
  export type Props = ComboboxInputGroupProps;
}

import { computed, defineComponent, useRootElement } from 'actview';
import type { ComputedRef } from '@actview/core';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { EMPTY_ARRAY } from '@base-ui/actview-utils/empty';
import { areArraysEqual } from '@base-ui/actview-utils/areArraysEqual';
import { useBaseUiId } from '../internals/useBaseUiId';
import { CheckboxGroupContext } from './CheckboxGroupContext';
import type { FieldRootState } from '../field/root/FieldRoot';
import { isEligibleInput } from '../field/root/useFieldValidation';
import { useFieldRootContext } from '../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../internals/field-register-control/useRegisterFieldControl';
import { useLabelableContext } from '../internals/labelable-provider/LabelableContext';
import { useLabelableId } from '../internals/labelable-provider/useLabelableId';
import type { BaseUIComponentProps, HTMLProps } from '../internals/types';
import { getStateAttributesProps } from '../internals/getStateAttributesProps';
import { fieldValidityMapping } from '../internals/field-constants/constants';
import { useCheckboxGroupParent } from './useCheckboxGroupParent';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';
import { useFormContext } from '../internals/form-context/FormContext';
import { useValueChanged } from '../internals/useValueChanged';
import { mergePropsN } from '../merge-props';

/**
 * Provides a shared state to a series of checkboxes.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export const CheckboxGroup = defineComponent(function (componentProps: CheckboxGroup.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();
  const formContext = useFormContext();

  const disabled = computed(
    () => fieldRootContext.value.disabled || (componentProps.disabled ?? false),
  );
  const fieldName = computed(() => fieldRootContext.value.name);

  const value = useControlled<string[]>({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue ?? EMPTY_ARRAY,
    name: 'CheckboxGroup',
    state: 'value',
  });

  const setValue = (v: string[], eventDetails: CheckboxGroup.ChangeEventDetails) => {
    componentProps.onValueChange?.(v, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    value.setValueIfUncontrolled(v);
  };

  const parent = useCheckboxGroupParent({
    allValues: componentProps.allValues,
    value: value as ComputedRef<string[]>,
    onValueChange: setValue,
  });

  // The group is the field's control and takes its name from `aria-labelledby`, so `Field.Label`
  // must not point `htmlFor` at one arbitrary checkbox inside the group.
  useLabelableId({ id: null });

  const id = useBaseUiId(componentProps.id);
  const getInputControl = fieldRootContext.value.validation.getInputControl;

  const controlRef = {
    get current() {
      return getInputControl();
    },
  };

  const getFormValue = () => {
    const formElement = formContext.value.elementRef.value;
    if (!formElement) {
      return value.value;
    }

    const successfulValues = new Set<string>();
    for (const [input, registration] of fieldRootContext.value.validation.registeredInputs) {
      if (
        registration.value !== undefined &&
        input.checked &&
        isEligibleInput(input, formElement)
      ) {
        successfulValues.add(registration.value);
      }
    }

    return (value.value ?? EMPTY_ARRAY).filter((inputValue) => successfulValues.has(inputValue));
  };

  useRegisterFieldControl(
    controlRef,
    id,
    value,
    getFormValue,
    computed(() => !!fieldName.value && !disabled.value),
    fieldName,
  );

  useValueChanged(value, () => {
    if (fieldName.value) {
      formContext.value.clearErrors(fieldName.value);
    }

    const initialValue = Array.isArray(fieldRootContext.value.validityData.initialValue)
      ? (fieldRootContext.value.validityData.initialValue as readonly string[])
      : EMPTY_ARRAY;

    const current = value.value ?? EMPTY_ARRAY;
    fieldRootContext.value.setFilled(current.length > 0);
    fieldRootContext.value.setDirty(!areArraysEqual(current, initialValue));

    fieldRootContext.value.validation.change(current);
  });

  const state = computed(
    () =>
      ({
        ...fieldRootContext.value.state,
        disabled: disabled.value,
      }) as CheckboxGroupState,
  );

  const contextValue = computed(() => ({
    allValues: componentProps.allValues,
    value: value.value ?? EMPTY_ARRAY,
    setValue,
    parent,
    disabled: disabled.value,
    validation: fieldRootContext.value.validation,
    registerControlId: labelableContext.value.registerControlId,
  }));

  const getDescriptionProps = labelableContext.value.getDescriptionProps;

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      allValues: _allValues,
      defaultValue: _defaultValue,
      disabled: _disabled,
      id: _id,
      onValueChange: _onValueChange,
      value: _value,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged = getDescriptionProps(
      mergePropsN([
        stateAttributes,
        elementProps,
        {
          id: componentProps.id,
          role: 'group',
          'aria-labelledby': labelableContext.value.labelId,
          className: typeof className === 'function' ? className(stateValue) : className,
          style: typeof style === 'function' ? style(stateValue) : style,
        },
      ]),
    );

    // render 三形态
    const providerValue = contextValue.value;
    if (typeof render === 'function') {
      return (
        <CheckboxGroupContext.Provider value={providerValue}>
          {render({ ...merged, ...stateValue, ref: rootRef })}
        </CheckboxGroupContext.Provider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <CheckboxGroupContext.Provider value={providerValue}>
          <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />
        </CheckboxGroupContext.Provider>
      );
    }
    return (
      <CheckboxGroupContext.Provider value={providerValue}>
        <div ref={rootRef} {...merged} />
      </CheckboxGroupContext.Provider>
    );
  };
}) as (props: CheckboxGroup.Props) => any;

export interface CheckboxGroupState extends FieldRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface CheckboxGroupProps extends BaseUIComponentProps<'div', CheckboxGroupState> {
  /**
   * Names of the checkboxes in the group that should be ticked.
   *
   * To render an uncontrolled checkbox group, use the `defaultValue` prop instead.
   */
  value?: string[] | undefined;
  /**
   * Names of the checkboxes in the group that should be initially ticked.
   *
   * To render a controlled checkbox group, use the `value` prop instead.
   */
  defaultValue?: string[] | undefined;
  /**
   * Event handler called when a checkbox in the group is ticked or unticked.
   * Provides the new value as an argument.
   */
  onValueChange?:
    | ((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void)
    | undefined;
  /**
   * Names of all checkboxes in the group. Use this when creating a parent checkbox.
   */
  allValues?: string[] | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type CheckboxGroupChangeEventReason = typeof REASONS.none;
export type CheckboxGroupChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxGroup.ChangeEventReason>;

export namespace CheckboxGroup {
  export type State = CheckboxGroupState;
  export type Props = CheckboxGroupProps;
  export type ChangeEventReason = CheckboxGroupChangeEventReason;
  export type ChangeEventDetails = CheckboxGroupChangeEventDetails;
}
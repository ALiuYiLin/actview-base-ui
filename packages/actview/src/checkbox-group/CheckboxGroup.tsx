import { computed, defineComponent, toValue, useRootElement } from 'actview';
import type { ComputedRef } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { EMPTY_ARRAY } from '@/internals/noop';
import { areArraysEqual } from '@/utils/areArraysEqual';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { CheckboxGroupContext } from './CheckboxGroupContext';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { isEligibleInput } from '@/field/root/useFieldValidation';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import { useCheckboxGroupParent } from './useCheckboxGroupParent';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useValueChanged } from '@/internals/useValueChanged';

/**
 * Provides a shared state to a series of checkboxes.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export const CheckboxGroup = defineComponent(function (componentProps: CheckboxGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const {
    disabled: fieldDisabled,
    name: fieldName,
    state: fieldState,
    validation,
    setFilled,
    setDirty,
    validityData,
  } = toValue(useFieldRootContext());
  const {labelId, registerControlId, getDescriptionProps} = toValue(useLabelableContext());
  const {clearErrors, elementRef} = toValue(useFormContext());

  const disabledProp = toValue(componentProps.disabled) ?? false;
  const defaultValueProp = toValue(componentProps.defaultValue);
  const allValues = toValue(componentProps.allValues);
  const externalValue = toValue(componentProps.value);
  const idProp = toValue(componentProps.id);
  const onValueChange = componentProps.onValueChange;

  const disabled = fieldDisabled.value || disabledProp;
  const defaultValue = defaultValueProp ?? EMPTY_ARRAY;

  const [value, setValueUnwrapped] = useControlled<string[]>({
    controlled: (externalValue as string[]) || undefined,
    default: defaultValue as string[],
    name: 'CheckboxGroup',
    state: 'value',
  });

  const setValue = (
    v: string[],
    eventDetails: CheckboxGroup.ChangeEventDetails,
  ) => {
    onValueChange?.(v, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(v);
  };

  const parent = useCheckboxGroupParent({
    allValues,
    value: value as ComputedRef<string[]>,
    onValueChange: setValue,
  });

  // The group is the field's control and takes its name from `aria-labelledby`, so `Field.Label`
  // must not point `htmlFor` at one arbitrary checkbox inside the group.
  useLabelableId({id: null});

  const id = useBaseUiId(idProp);
  const getInputControl = validation.getInputControl;

  const controlRef = {
    get current() {
      return getInputControl();
    },
  };

  const getFormValue = () => {
    const formElement = elementRef.value;
    if (!formElement) {
      return value.value;
    }

    const successfulValues = new Set<string>();
    for (const [input, registration] of validation.registeredInputs) {
      if (
        registration.value !== undefined &&
        input.checked &&
        isEligibleInput(input, formElement)
      ) {
        successfulValues.add(registration.value);
      }
    }

    return (value.value ?? []).filter((inputValue) => successfulValues.has(inputValue));
  };

  useRegisterFieldControl(
    controlRef as any,
    id,
    value.value as string[],
    getFormValue,
    !!fieldName.value && !disabled,
    fieldName.value,
  );

  useValueChanged(() => value.value, () => {
    if (fieldName.value) {
      clearErrors(fieldName.value);
    }

    const initialValue = Array.isArray(validityData.value.initialValue)
      ? (validityData.value.initialValue as readonly string[])
      : EMPTY_ARRAY;

    const currentValue = value.value ?? [];
    setFilled(currentValue.length > 0);
    setDirty(!areArraysEqual(currentValue, initialValue));

    validation.change(currentValue);
  });

  const contextValue = {
    allValues,
    value,
    setValue,
    parent,
    disabled,
    validation,
    registerControlId,
  };

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = {...fieldState.value, disabled};
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {id: idProp, role: 'group', 'aria-labelledby': labelId.value},
      elementProps,
      stateAttributes,
    );
    const describedByProps = getDescriptionProps(merged);
    Object.assign(merged, describedByProps);

    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return (
      <CheckboxGroupContext.Provider value={contextValue as any}>
        <div {...merged} ref={rootRef} />
      </CheckboxGroupContext.Provider>
    );
  };
}) as unknown as (props: CheckboxGroup.Props) => JSX.Element;

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

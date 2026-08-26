import { computed, toValue, toRefs, unrefs, useRootElement } from 'actview';
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
import type { BaseUIComponentProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import { useCheckboxGroupParent } from './useCheckboxGroupParent';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useValueChanged } from '@/internals/useValueChanged';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Provides a shared state to a series of checkboxes.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export function CheckboxGroup(componentProps: CheckboxGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<CheckboxGroupContext.Provider>`），无 Fragment 根问题。
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

  const defaultValueProp = toValue(componentProps.defaultValue);
  const idProp = toValue(componentProps.id);
  const onValueChange = componentProps.onValueChange;

  // setup 快照（用于 useRegisterFieldControl 等 setup 期注册）；渲染期的
  // contextValue/stateFn 会重新计算 disabled（Field.Root 或本组件 disabled
  // 动态变化时实时生效——见下方注释）。
  const disabled = fieldDisabled.value || (toValue(componentProps.disabled) ?? false);
  const defaultValue = defaultValueProp ?? EMPTY_ARRAY;

  const [value, setValueUnwrapped] = useControlled<string[]>({
    // getter：渲染期读 componentProps.value（setup 快照会导致受控更新不生效）
    controlled: () => (toValue(componentProps.value) as string[]) || undefined,
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
    // getter：渲染期读 componentProps.allValues（响应式）——setup 快照会停留在首渲染
    allValues: (() => toValue(componentProps.allValues) ?? ([] as string[])) as any,
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

  // computed：value/disabled/allValues 变化时重建 contextValue（新对象引用）——
  // Provider 只响应 value 引用变化，setup 快照对象会导致子组件不重渲染。
  // disabled 在 getter 内渲染期求值（componentProps 响应式）——动态变化实时生效。
  const contextValue = computed(() => ({
    allValues: toValue(componentProps.allValues),
    value,
    setValue,
    parent,
    disabled: fieldDisabled.value || (toValue(componentProps.disabled) ?? false),
    validation,
    registerControlId,
  }));

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): CheckboxGroupState => ({
    ...fieldState.value,
    disabled: fieldDisabled.value || (toValue(componentProps.disabled) ?? false),
  });

  const {element} = useRenderElement({
    props: () => {
      const stateValue = stateFn();
      const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

      const merged: any = Object.assign(
        {},
        {id: idProp, role: 'group', 'aria-labelledby': labelId.value},
        unrefs(elementProps),
        stateAttributes,
      );
      const describedByProps = getDescriptionProps(merged);
      return [merged, describedByProps];
    },
    state: stateFn,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CheckboxGroupContext.Provider value={contextValue.value as any}>
      {element()}
    </CheckboxGroupContext.Provider>
  );
}

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

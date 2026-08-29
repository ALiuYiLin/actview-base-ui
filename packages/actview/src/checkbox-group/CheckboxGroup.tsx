import { computed, ref, toRefs } from 'actview';
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
import type { Ref } from 'actview';
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
  // 自持 ref：经 params.ref 合并链透传到渲染元素（不用 useRootElement）。
  const rootRef = ref<HTMLElement | null>(null);

  const {
    disabled: fieldDisabled,
    name: fieldName,
    state: fieldState,
    validation,
    setFilled,
    setDirty,
    validityData,
  } = useFieldRootContext();
  const {labelId, registerControlId, getDescriptionProps} = useLabelableContext();
  const {clearErrors, elementRef} = useFormContext();

  // 初始化型快照（仅喂 useControlled 初值——对齐 React「初始化器只读一次」）。
  // ⚠️ id / onValueChange 等渲染期、事件期消费的 props 一律调用时直读
  // componentProps.x（setup 快照会在父更新后读到旧值/旧回调）。
  const defaultValueProp = componentProps.defaultValue;
  const defaultValue = defaultValueProp ?? EMPTY_ARRAY;

  const disabled = computed(() => fieldDisabled.value || (componentProps.disabled ?? false));

  const [value, setValueUnwrapped] = useControlled<string[]>({
    // getter：渲染期读 componentProps.value（setup 快照会导致受控更新不生效）
    controlled: () => (componentProps.value as string[]) || undefined,
    default: defaultValue as string[],
    name: 'CheckboxGroup',
    state: 'value',
  });

  const setValue = (
    v: string[],
    eventDetails: CheckboxGroup.ChangeEventDetails,
  ) => {
    // 事件期直读 props——父组件换新回调引用也能拿到最新。
    componentProps.onValueChange?.(v, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(v);
  };

  const parent = useCheckboxGroupParent({
    // getter：渲染期读 componentProps.allValues（响应式）——setup 快照会停留在首渲染
    allValues: (() => componentProps.allValues ?? ([] as string[])) as any,
    value: value as any,
    onValueChange: setValue,
  });

  // The group is the field's control and takes its name from `aria-labelledby`, so `Field.Label`
  // must not point `htmlFor` at one arbitrary checkbox inside the group.
  useLabelableId({id: null});

  const id = useBaseUiId(componentProps.id);
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
    !!fieldName.value && !disabled.value,
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

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，每次渲染新对象会冻结快照）——字段经 getter 渲染期求值（componentProps
  // /computed 响应式），消费端读字段即追踪。
  const contextValue: CheckboxGroupContext = {
    get allValues() {
      return componentProps.allValues;
    },
    get value() {
      return value.value ?? [];
    },
    setValue,
    parent,
    get disabled() {
      return fieldDisabled.value || (componentProps.disabled ?? false);
    },
    validation,
    registerControlId,
  };

  // 值形 props toRefs 活引用；id 走 setup 快照（rootProps 里消费）；children
  // 不解构、随 elementRefs 流入渲染元素。组件自定义 props（value/defaultValue/
  // onValueChange/allValues/disabled）剔除——否则泄漏到 DOM（对齐 React）。
  const {
    className,
    render,
    style,
    id: _id,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    allValues: _allValues,
    disabled: _disabled,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<CheckboxGroupState>(() => ({
    ...fieldState.value,
    disabled: fieldDisabled.value || (componentProps.disabled ?? false),
  }));

  const stateAttributes = computed(() =>
    getStateAttributesProps(state.value, fieldValidityMapping),
  );

  const rootProps = computed(() =>
    getDescriptionProps({
      id: componentProps.id,
      role: 'group',
      'aria-labelledby': labelId.value,
      ...elementProps.value,
      ...stateAttributes.value,
    }),
  );

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: rootRef,
          props: rootProps.value,
        },
      )}
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

import { ref, toRefs, unrefs, computed } from 'actview';
import type { ComputedRef } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { contains } from '@/utils/shadowDom';
import { SHIFT } from '@/internals/composite/composite';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { isEligibleInput } from '@/field/root/useFieldValidation';
import { useFieldsetRootContext } from '@/fieldset/root/FieldsetRootContext';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useValueChanged } from '@/internals/useValueChanged';
import { RadioGroupContext } from './RadioGroupContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { Ref } from 'actview';

const MODIFIER_KEYS = [SHIFT];

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export function RadioGroup<Value>(componentProps: RadioGroup.Props<Value>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {
    setTouched: setFieldTouched,
    setFocused,
    validationMode,
    name: fieldName,
    disabled: fieldDisabled,
    state: fieldState,
    validation,
    setDirty,
    setFilled,
    validityData,
  } = useFieldRootContext();
  const {labelId} = useLabelableContext();
  const {clearErrors, elementRef} = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);

  const defaultValue = componentProps.defaultValue;
  const idProp = componentProps.id;
  const inputRefProp = componentProps.inputRef as
    | Ref<HTMLInputElement | null>
    | ((element: HTMLInputElement | null) => void)
    | undefined;
  const onValueChangeProp = componentProps.onValueChange;

  // disabled/readOnly/required/form/name 用 computed：Field.Root 或本组件
  // props 动态变化时渲染期 `.value` 与 context 消费方（Radio）都能拿到实时值。
  // getter 直接读 componentProps（响应式）——setup 快照（*Prop）会导致 computed
  // 依赖不追踪 props 变化而停留在首渲染。
  const disabled = computed(() => fieldDisabled.value || (componentProps.disabled ?? false));
  const readOnly = computed(() => componentProps.readOnly);
  const required = computed(() => componentProps.required);
  const form = computed(() => componentProps.form);
  const name = computed(() => fieldName.value ?? componentProps.name);
  const id = useBaseUiId(idProp);

  const [checkedValue, setCheckedValueUnwrapped] = useControlled<Value>({
    // 受控值用 getter：外部 `value` prop 动态变化时实时生效（P1 教训：受控需传 getter）
    controlled: () => componentProps.value,
    default: defaultValue,
    name: 'RadioGroup',
    state: 'value',
  });
  const touched = ref(false);

  const setCheckedValue = (
    value: Value,
    eventDetails: RadioGroup.ChangeEventDetails,
  ) => {
    onValueChangeProp?.(value, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setCheckedValueUnwrapped(value);
  };

  const getInputControl = validation.getInputControl;
  const controlRef = {
    get current() {
      return getInputControl();
    },
  };
  const groupInputRef = ref(null as HTMLInputElement | null);
  const firstEnabledInputRef = ref(null as HTMLInputElement | null);

  // Only forwards the public `inputRef` and tracks the current representative for that forwarding.
  // The registry (`validation.registeredInputs`) is authoritative for validation and form-value
  // projection, so the group must not write `validation.inputRef`: a stale, unmounted radio left
  // there would become the Field's fallback once the registry empties and keep blocking submission.
  function setInputRef(hiddenInput: HTMLInputElement | null): (() => void) | undefined {
    let cleanup: (() => void) | undefined = undefined;

    if (inputRefProp) {
      if (typeof inputRefProp === 'function') {
        const result = inputRefProp(hiddenInput);
        if (typeof result === 'function') {
          cleanup = result;
        }
      } else {
        inputRefProp.value = hiddenInput;
      }
    }

    groupInputRef.value = hiddenInput;

    return cleanup;
  }

  const registerInputRef = (input: HTMLInputElement | null) => {
    if (!input || input.disabled) {
      return undefined;
    }

    if (!firstEnabledInputRef.value) {
      firstEnabledInputRef.value = input;
    }

    const currentInput = groupInputRef.value;
    const cleanup =
      input.checked || currentInput == null || currentInput.disabled
        ? setInputRef(input)
        : undefined;

    // Detach when this input unmounts while still forwarded, so consumers don't
    // keep holding a disconnected node. The input may have become the forwarded
    // one after attach (via the re-registration effect), so always return this.
    return () => {
      if (firstEnabledInputRef.value === input) {
        firstEnabledInputRef.value = null;
      }
      if (groupInputRef.value === input) {
        if (cleanup) {
          cleanup();
          groupInputRef.value = null;
        } else {
          void setInputRef(null);
        }
      } else {
        cleanup?.();
      }
    };
  };

  const getFormValue = () => {
    const formElement = elementRef.value;
    if (!formElement) {
      return checkedValue.value ?? null;
    }

    for (const input of validation.registeredInputs.keys()) {
      if (input.checked && isEligibleInput(input, formElement)) {
        return checkedValue.value ?? null;
      }
    }

    return null;
  };

  useRegisterFieldControl(
    controlRef as any,
    id,
    checkedValue.value ?? null,
    getFormValue,
    !disabled.value,
    name.value,
  );

  useValueChanged(() => checkedValue.value, () => {
    clearErrors(name.value);

    setDirty(checkedValue.value !== validityData.value.initialValue);
    setFilled(checkedValue.value != null);

    validation.change(checkedValue.value);

    const fallbackInput = firstEnabledInputRef.value;
    if (checkedValue.value == null && fallbackInput && !fallbackInput.disabled) {
      // Imperative re-point outside React's ref lifecycle; the ref-callback cleanup isn't tracked here.
      void setInputRef(fallbackInput);
    }
  });

  const ariaLabelledby = labelId.value ?? fieldsetContext?.legendId;

  // contextValue 在 setup 创建但内部放 refs/computed（同 LabelableProvider 模式）——
  // 消费方读 `.value`/toValue 保持实时。
  const contextValue: RadioGroupContext<Value> = {
    checkedValue,
    disabled,
    form,
    validation,
    name,
    readOnly,
    registerInputRef: registerInputRef as any,
    required,
    setCheckedValue,
    setTouched: (v: boolean) => (touched.value = v),
    touched,
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // defaultProps/state 在渲染期 IIFE 中构建（对齐 React 版每次 render 重算——
  // setup 快照会导致 disabled/readOnly 等动态变化时 data-* 不更新）。
  return (
    <RadioGroupContext.Provider value={contextValue as any}>
      {(() => {
        const readOnlyValue = readOnly.value;
        const requiredValue = required.value;

        const defaultProps = {
          id: idProp,
          role: 'radiogroup',
          'aria-required': requiredValue || undefined,
          'aria-disabled': disabled.value || undefined,
          'aria-readonly': readOnlyValue || undefined,
          'aria-labelledby': ariaLabelledby,
          onFocus() {
            setFocused(true);
          },
          onBlur(event: any) {
            if (!contains(event.currentTarget, event.relatedTarget)) {
              setFieldTouched(true);
              setFocused(false);

              if (validationMode.value === 'onBlur') {
                validation.commit(checkedValue.value);
              }
            }
          },
          onKeyDownCapture(event: any) {
            if (event.key.startsWith('Arrow')) {
              touched.value = true;
              setFocused(true);
            }
          },
        };

        const state: RadioGroupState = {
          ...fieldState.value,
          disabled: disabled.value,
          required: requiredValue ?? false,
          readOnly: readOnlyValue ?? false,
        };

        return (
          <CompositeRoot
            render={render as any}
            className={className as any}
            style={style as any}
            state={state as any}
            props={[
              defaultProps,
              unrefs(elementProps),
              (props: any) => validation.getValidationProps(disabled.value, props),
            ]}
            stateAttributesMapping={fieldValidityMapping}
            enableHomeAndEndKeys={false}
            modifierKeys={MODIFIER_KEYS}
            children={children?.value}
          />
        );
      })()}
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupState extends FieldRootState {
  /**
   * Whether the user should be unable to select a different radio button in the group.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick a radio button within the group before submitting a form.
   */
  required: boolean;
}

export interface RadioGroupProps<Value = any>
  extends Omit<BaseUIComponentProps<'div', RadioGroupState>, 'value'> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to select a different radio button in the group.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the radio inputs.
   * Useful when the radio group is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: Value | undefined;
  /**
   * The uncontrolled value of the radio button that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: Value | undefined;
  /**
   * Callback fired when the value changes.
   */
  onValueChange?: ((value: Value, eventDetails: RadioGroup.ChangeEventDetails) => void) | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: Ref<HTMLInputElement | null> | ((element: HTMLInputElement | null) => void) | undefined;
}

export type RadioGroupChangeEventReason = typeof REASONS.none;

export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type Props<TValue = any> = RadioGroupProps<TValue>;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}

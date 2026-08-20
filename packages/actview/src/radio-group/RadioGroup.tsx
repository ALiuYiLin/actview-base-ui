import { computed, defineComponent, ref } from 'actview';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import type { BaseUIComponentProps, HTMLProps, RefValue } from '../internals/types';
import { useBaseUiId } from '../internals/useBaseUiId';
import { contains } from '../floating-ui-actview/utils';
import { SHIFT } from '../internals/composite/composite';
import { CompositeRoot } from '../internals/composite/root/CompositeRoot';
import { useFieldRootContext } from '../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../internals/field-register-control/useRegisterFieldControl';
import { fieldValidityMapping } from '../internals/field-constants/constants';
import type { FieldRootState } from '../field/root/FieldRoot';
import { isEligibleInput } from '../field/root/useFieldValidation';
import { useFieldsetRootContext } from '../fieldset/root/FieldsetRootContext';
import { useFormContext } from '../internals/form-context/FormContext';
import { useLabelableContext } from '../internals/labelable-provider/LabelableContext';
import { useValueChanged } from '../internals/useValueChanged';
import { RadioGroupContext } from './RadioGroupContext';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';

const MODIFIER_KEYS = [SHIFT];

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export const RadioGroup = defineComponent(function <Value>(componentProps: RadioGroup.Props<Value>) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）；未重构家族（field-root/labelable）自封装
  // context 与官方 context 的 use() 都返回 ref 形态，读 .value 一致
  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();
  const formContext = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);

  const disabled = computed<boolean | undefined>(
    () => fieldRootContext.value.disabled || componentProps.disabled,
  );
  const name = computed(() => fieldRootContext.value.name ?? componentProps.name);

  // setup 顶层：生成一次兜底 id（稳定）；注册 id 渲染期合成（idProp ?? fallbackId）
  const fallbackId = useBaseUiId();

  const checkedValue = useControlled<Value>({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue,
    name: 'RadioGroup',
    state: 'value',
  });
  const touched = ref(false);
  const setTouched = (value: boolean) => {
    touched.value = value;
  };

  const setCheckedValue = (value: Value, eventDetails: RadioGroup.ChangeEventDetails) => {
    componentProps.onValueChange?.(value, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    checkedValue.setValueIfUncontrolled(value);
  };

  const controlRef = {
    get current() {
      return fieldRootContext.value.validation.getInputControl();
    },
  };
  const groupInputRef = { current: null as HTMLInputElement | null };
  const firstEnabledInputRef = { current: null as HTMLInputElement | null };

  // Only forwards the public `inputRef` and tracks the current representative for that forwarding.
  // The registry (`validation.registeredInputs`) is authoritative for validation and form-value
  // projection, so the group must not write `validation.inputRef`: a stale, unmounted radio left
  // there would become the Field's fallback once the registry empties and keep blocking submission.
  function setInputRef(hiddenInput: HTMLInputElement | null): (() => void) | undefined {
    let cleanup: (() => void) | undefined = undefined;

    if (componentProps.inputRef) {
      if (typeof componentProps.inputRef === 'function') {
        // React 语义：ref 回调可返回清理函数；actview 侧仅记录（void 分支忽略）
        cleanup = componentProps.inputRef(hiddenInput) as (() => void) | undefined;
      } else {
        componentProps.inputRef.current = hiddenInput;
      }
    }

    groupInputRef.current = hiddenInput;

    return cleanup;
  }

  const registerInputRef = (input: HTMLInputElement | null) => {
    if (!input || input.disabled) {
      return undefined;
    }

    if (!firstEnabledInputRef.current) {
      firstEnabledInputRef.current = input;
    }

    const currentInput = groupInputRef.current;
    const cleanup =
      input.checked || currentInput == null || currentInput.disabled
        ? setInputRef(input)
        : undefined;

    // Detach when this input unmounts while still forwarded, so consumers don't
    // keep holding a disconnected node. The input may have become the forwarded
    // one after attach (via the re-registration effect), so always return this.
    return () => {
      if (firstEnabledInputRef.current === input) {
        firstEnabledInputRef.current = null;
      }
      if (groupInputRef.current === input) {
        if (cleanup) {
          cleanup();
          groupInputRef.current = null;
        } else {
          void setInputRef(null);
        }
      } else {
        cleanup?.();
      }
    };
  };

  const getFormValue = () => {
    const formElement = formContext.value.elementRef.value;
    if (!formElement) {
      return checkedValue.value ?? null;
    }

    for (const input of fieldRootContext.value.validation.registeredInputs.keys()) {
      if (input.checked && isEligibleInput(input, formElement)) {
        return checkedValue.value ?? null;
      }
    }

    return null;
  };

  // 注册 id：computed 渲染期求值（idProp 变化时重新注册）——MaybeRef 不含 getter，
  // 必须传 ref 形态（React 语义 idProp ?? useId()）
  const registeredId = computed(() => componentProps.id ?? fallbackId);

  useRegisterFieldControl(
    controlRef,
    registeredId,
    () => checkedValue.value ?? null,
    getFormValue,
    computed(() => !disabled.value),
    computed(() => componentProps.name),
  );

  useValueChanged(checkedValue, () => {
    formContext.value.clearErrors(name.value);

    fieldRootContext.value.setDirty(
      checkedValue.value !== fieldRootContext.value.validityData.initialValue,
    );
    fieldRootContext.value.setFilled(checkedValue.value != null);

    fieldRootContext.value.validation.change(checkedValue.value);

    const fallbackInput = firstEnabledInputRef.current;
    if (checkedValue.value == null && fallbackInput && !fallbackInput.disabled) {
      // Imperative re-point outside React's ref lifecycle; the ref-callback cleanup isn't tracked here.
      void setInputRef(fallbackInput);
    }
  });

  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo）
  const contextValue = computed<RadioGroupContext<Value>>(() => ({
    checkedValue: checkedValue.value,
    disabled: disabled.value,
    form: componentProps.form,
    validation: fieldRootContext.value.validation,
    name: name.value,
    readOnly: componentProps.readOnly,
    registerInputRef,
    required: componentProps.required,
    setCheckedValue,
    setTouched,
    touched: touched.value,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      disabled: _disabled, // setup computed 已接管
      readOnly,
      required,
      onValueChange: _onValueChange, // setup setCheckedValue 已接管
      value: _value, // setup useControlled 已接管
      defaultValue: _defaultValue, // setup useControlled 已接管
      form: _form, // 进 contextValue
      name: _name, // setup computed 已接管
      inputRef: _inputRef, // setup setInputRef 已接管
      id: idProp,
      style,
      ref: _ref, // 用户 ref：CompositeRoot 内部 rootRef 自取根，无需转发
      ...elementProps
    } = componentProps;

    // 注册 id 渲染期合成（React 语义 idProp ?? useId()）；root 元素只显示显式 idProp
    const ariaLabelledby = labelableContext.value.labelId ?? fieldsetContext.value?.legendId;

    const state: RadioGroupState = {
      ...fieldRootContext.value.state,
      disabled: disabled.value ?? false,
      required: required ?? false,
      readOnly: readOnly ?? false,
    };

    const defaultProps: HTMLProps = {
      id: idProp,
      role: 'radiogroup',
      'aria-required': required || undefined,
      'aria-disabled': disabled.value || undefined,
      'aria-readonly': readOnly || undefined,
      'aria-labelledby': ariaLabelledby,
      onFocus() {
        fieldRootContext.value.setFocused(true);
      },
      onBlur(event: FocusEvent) {
        if (!contains(event.currentTarget as Element, event.relatedTarget as Element)) {
          fieldRootContext.value.setTouched(true);
          fieldRootContext.value.setFocused(false);

          if (fieldRootContext.value.validationMode === 'onBlur') {
            fieldRootContext.value.validation.commit(checkedValue.value);
          }
        }
      },
      onKeyDownCapture(event: KeyboardEvent) {
        if (event.key.startsWith('Arrow')) {
          touched.value = true;
          fieldRootContext.value.setFocused(true);
        }
      },
    };

    // ⚠️ getValidationProps 必须传函数（propsGetter）且放数组最后：它接收 previousProps
    // （externalProps 链），disabled 拦截需在最终合并层（案例 10）
    return (
      <RadioGroupContext.Provider value={contextValue.value}>
        <CompositeRoot
          render={render}
          className={className}
          style={style}
          state={state}
          props={[
            defaultProps,
            elementProps,
            (p: HTMLProps) =>
              fieldRootContext.value.validation.getValidationProps(disabled.value ?? false, p),
          ]}
          stateAttributesMapping={fieldValidityMapping}
          enableHomeAndEndKeys={false}
          modifierKeys={MODIFIER_KEYS}
        />
      </RadioGroupContext.Provider>
    );
  };
}) as <Value>(props: RadioGroup.Props<Value>) => any;

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

export interface RadioGroupProps<Value = any> extends Omit<
  BaseUIComponentProps<'div', RadioGroupState>,
  'value'
> {
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
  inputRef?: RefValue<HTMLInputElement> | undefined;
}

export type RadioGroupChangeEventReason = typeof REASONS.none;

export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type Props<TValue = any> = RadioGroupProps<TValue>;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}

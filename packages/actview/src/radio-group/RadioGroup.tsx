import { defineComponent, ref, toValue } from 'actview';
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

const MODIFIER_KEYS = [SHIFT];

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export const RadioGroup = defineComponent(function <Value>(componentProps: RadioGroup.Props<Value>) {
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
  } = toValue(useFieldRootContext());
  const {labelId} = toValue(useLabelableContext());
  const {clearErrors, elementRef} = toValue(useFormContext());
  const fieldsetContext = toValue(useFieldsetRootContext(true));

  const disabledProp = toValue(componentProps.disabled);
  const readOnly = toValue(componentProps.readOnly);
  const required = toValue(componentProps.required);
  const form = toValue(componentProps.form);
  const nameProp = toValue(componentProps.name);
  const idProp = toValue(componentProps.id);
  const externalValue = toValue(componentProps.value);
  const defaultValue = toValue(componentProps.defaultValue);
  const inputRefProp = componentProps.inputRef as
    | {current: HTMLInputElement | null}
    | ((element: HTMLInputElement | null) => void)
    | undefined;
  const onValueChangeProp = componentProps.onValueChange;

  const disabled = fieldDisabled.value || disabledProp;
  const name = fieldName.value ?? nameProp;
  const id = useBaseUiId(idProp);

  const [checkedValue, setCheckedValueUnwrapped] = useControlled<Value>({
    controlled: externalValue,
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
  const groupInputRef = {current: null as HTMLInputElement | null};
  const firstEnabledInputRef = {current: null as HTMLInputElement | null};

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
        inputRefProp.current = hiddenInput;
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
    const formElement = elementRef.current;
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
    !disabled,
    nameProp,
  );

  useValueChanged(() => checkedValue.value, () => {
    clearErrors(name);

    setDirty(checkedValue.value !== validityData.value.initialValue);
    setFilled(checkedValue.value != null);

    validation.change(checkedValue.value);

    const fallbackInput = firstEnabledInputRef.current;
    if (checkedValue.value == null && fallbackInput && !fallbackInput.disabled) {
      // Imperative re-point outside React's ref lifecycle; the ref-callback cleanup isn't tracked here.
      void setInputRef(fallbackInput);
    }
  });

  const ariaLabelledby = labelId.value ?? fieldsetContext?.legendId;

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
    touched: touched.value,
  };

  const defaultProps = {
    id: idProp,
    role: 'radiogroup',
    'aria-required': required || undefined,
    'aria-disabled': disabled || undefined,
    'aria-readonly': readOnly || undefined,
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const state: RadioGroupState = {
      ...fieldState.value,
      disabled: disabled ?? false,
      required: required ?? false,
      readOnly: readOnly ?? false,
    };

    return (
      <RadioGroupContext.Provider value={contextValue as any}>
        <CompositeRoot
          render={render}
          className={className}
          style={style}
          state={state}
          props={[
            defaultProps,
            elementProps,
            (props: any) => validation.getValidationProps(disabled ?? false, props),
          ]}
          stateAttributesMapping={fieldValidityMapping}
          enableHomeAndEndKeys={false}
          modifierKeys={MODIFIER_KEYS}
          children={componentProps.children}
        />
      </RadioGroupContext.Provider>
    );
  };
}) as unknown as <Value>(props: RadioGroup.Props<Value>) => JSX.Element;

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
  inputRef?: {current: HTMLInputElement | null} | ((element: HTMLInputElement | null) => void) | undefined;
}

export type RadioGroupChangeEventReason = typeof REASONS.none;

export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type Props<TValue = any> = RadioGroupProps<TValue>;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}

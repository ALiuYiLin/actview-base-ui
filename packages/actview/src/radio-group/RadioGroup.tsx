import { computed, ref } from 'actview';
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
export function RadioGroup<Value>(props: RadioGroup.Props<Value>) {
  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();
  const formContext = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);

  const disabled = computed<boolean | undefined>(
    () => fieldRootContext.value.disabled || props.disabled,
  );
  const name = computed(() => fieldRootContext.value.name ?? props.name);
  const id = useBaseUiId(props.id);

  const checkedValue = useControlled<Value>({
    controlled: () => props.value,
    default: () => props.defaultValue,
    name: 'RadioGroup',
    state: 'value',
  });
  const touched = ref(false);
  const setTouched = (value: boolean) => {
    touched.value = value;
  };

  const setCheckedValue = (value: Value, eventDetails: RadioGroup.ChangeEventDetails) => {
    props.onValueChange?.(value, eventDetails);

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
  function setInputRef(hiddenInput: HTMLInputElement | null) {
    let cleanup: void | (() => void) | undefined = undefined;

    if (props.inputRef) {
      if (typeof props.inputRef === 'function') {
        cleanup = props.inputRef(hiddenInput);
      } else {
        props.inputRef.current = hiddenInput;
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
    const formElement = formContext.value.elementRef.current;
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

  useRegisterFieldControl(
    controlRef,
    id,
    () => checkedValue.value ?? null,
    getFormValue,
    () => !disabled.value,
    () => props.name,
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

  const ariaLabelledby = computed(
    () => labelableContext.value.labelId ?? fieldsetContext.value?.legendId,
  );

  const state = computed<RadioGroupState>(() => ({
    ...fieldRootContext.value.state,
    disabled: disabled.value ?? false,
    required: props.required ?? false,
    readOnly: props.readOnly ?? false,
  }));

  const contextValue = computed<RadioGroupContext<Value>>(() => ({
    checkedValue: checkedValue.value,
    disabled: disabled.value,
    form: props.form,
    validation: fieldRootContext.value.validation,
    name: name.value,
    readOnly: props.readOnly,
    registerInputRef,
    required: props.required,
    setCheckedValue,
    setTouched,
    touched: touched.value,
  }));

  const getDefaultProps = () => ({
    id: props.id,
    role: 'radiogroup',
    'aria-required': props.required || undefined,
    'aria-disabled': disabled.value || undefined,
    'aria-readonly': props.readOnly || undefined,
    'aria-labelledby': ariaLabelledby.value,
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
  });

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      readOnly: _readOnly,
      required: _required,
      onValueChange: _onValueChange,
      value: _value,
      defaultValue: _defaultValue,
      form: _form,
      name: _name,
      inputRef: _inputRef,
      id: _id,
      style: _style,
      ref: _ref,
      ...elementProps
    } = props;
    return elementProps;
  };

  const getValidationProps = (externalProps: HTMLProps) =>
    fieldRootContext.value.validation.getValidationProps(disabled.value ?? false, externalProps);

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <CompositeRoot
        render={props.render}
        className={props.className}
        style={props.style}
        state={state.value}
        props={[getDefaultProps, getElementProps, getValidationProps]}
        refs={[props.ref]}
        stateAttributesMapping={fieldValidityMapping}
        enableHomeAndEndKeys={false}
        modifierKeys={MODIFIER_KEYS}
      />
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

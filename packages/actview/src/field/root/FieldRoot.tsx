import { computed, onMounted, onUnmounted, ref, watch } from 'actview';
import { FieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import {
  DEFAULT_VALIDITY_STATE,
  fieldValidityMapping,
} from '../../internals/field-constants/constants';
import { useFieldsetRootContext } from '../../fieldset/root/FieldsetRootContext';
import type { Form } from '../../form';
import { useFormContext } from '../../internals/form-context/FormContext';
import { LabelableProvider } from '../../internals/labelable-provider';
import type { BaseUIComponentProps, HTMLProps, RefObject } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFieldValidation } from './useFieldValidation';
import { useFieldControlRegistration } from '../../internals/field-register-control/useFieldControlRegistration';
import { mergeProps } from '../../merge-props';

/**
 * @internal
 */
function FieldRootInner(componentProps: FieldRoot.Props) {
  const formContext = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);

  const validate = (
    value: unknown,
    formValues: Form.Values,
  ): string | string[] | null | void | Promise<string | string[] | null | void> => {
    const validateProp = componentProps.validate;
    return validateProp ? validateProp(value, formValues) : null;
  };

  const disabled = computed(
    () => (fieldsetContext.value?.disabled ?? false) || (componentProps.disabled ?? false),
  );

  const touchedState = ref(false);
  const dirtyState = ref(false);
  const filled = ref(false);
  const focused = ref(false);

  const dirty = computed(() => componentProps.dirty ?? dirtyState.value);
  const touched = computed(() => componentProps.touched ?? touchedState.value);

  const markedDirtyRef: RefObject<boolean> = { current: dirty.value };
  const registeredFieldIdRef: RefObject<string | undefined> = { current: undefined };
  const registeredFieldName = ref<string | undefined>(undefined);
  const effectiveName = computed(() => componentProps.name ?? registeredFieldName.value);

  watch(
    () => componentProps.dirty,
    (dirtyProp: boolean | undefined) => {
      if (dirtyProp !== undefined) {
        markedDirtyRef.current = dirtyProp;
      }
    },
    { immediate: true },
  );

  const setDirty = (value: boolean) => {
    if (componentProps.dirty !== undefined) {
      return;
    }

    if (value) {
      markedDirtyRef.current = true;
    }
    dirtyState.value = value;
  };

  const setTouched = (value: boolean) => {
    if (componentProps.touched !== undefined) {
      return;
    }
    touchedState.value = value;
  };

  const setFilled = (value: boolean) => {
    filled.value = value;
  };

  const setFocused = (value: boolean) => {
    focused.value = value;
  };

  const validationMode = computed(
    () => componentProps.validationMode ?? formContext.value.validationMode,
  );

  const shouldValidateOnChange = () =>
    validationMode.value === 'onChange' ||
    (validationMode.value === 'onSubmit' && formContext.value.submitAttemptedRef.current);

  const formError = computed(() => {
    const name = effectiveName.value;
    const errors = formContext.value.errors;
    return name && Object.hasOwn(errors, name) ? errors[name] : null;
  });

  const hasFormError = computed(() => {
    const error = formError.value;
    return !!(Array.isArray(error) ? error.length : error);
  });

  const invalid = computed(() => componentProps.invalid === true || hasFormError.value);

  const validityData = ref<FieldValidityData>({
    state: DEFAULT_VALIDITY_STATE,
    error: '',
    errors: [],
    value: null,
    initialValue: null,
  });

  // App-controlled invalidity (the `invalid` prop and `<Form>` errors) keeps the field marked
  // invalid even while disabled. Only computed validity (native constraints and `validate`)
  // is suppressed when disabled, matching `:disabled` not participating in constraint validation.
  const valid = computed(
    () => !invalid.value && (disabled.value ? null : validityData.value.state.valid),
  );

  const state = computed(
    () =>
      ({
        disabled: disabled.value,
        touched: touched.value,
        dirty: dirty.value,
        valid: valid.value,
        filled: filled.value,
        focused: focused.value,
      }) as FieldRootState,
  );

  const setValidityData = (data: FieldValidityData) => {
    validityData.value = data;
  };

  const validation = useFieldValidation({
    setValidityData,
    validate,
    validityData,
    validationDebounceTime: computed(() => componentProps.validationDebounceTime ?? 0),
    invalid,
    markedDirtyRef,
    state,
    shouldValidateOnChange,
    validationMode,
    registeredFieldIdRef,
  });

  const [validateFieldControl, registerFieldControl] = useFieldControlRegistration({
    change: validation.change,
    commit: validation.commit,
    invalid,
    markedDirtyRef,
    name: computed(() => componentProps.name),
    setRegisteredFieldName: (name) => {
      registeredFieldName.value = name;
    },
    registeredFieldIdRef,
    setValidityData,
    validityData,
  });

  onMounted(() => {
    if (componentProps.actionsRef) {
      componentProps.actionsRef.current = { validate: validateFieldControl };
    }
  });

  onUnmounted(() => {
    if (componentProps.actionsRef) {
      componentProps.actionsRef.current = null;
    }
  });

  const contextValue = computed<FieldRootContext>(() => ({
    invalid: invalid.value,
    name: effectiveName.value,
    validityData: validityData.value,
    setValidityData,
    disabled: disabled.value,
    setTouched,
    setDirty,
    setFilled,
    setFocused,
    validationMode: validationMode.value,
    shouldValidateOnChange,
    state: state.value,
    registerFieldControl,
    validation,
  }));

  const getElementProps = (externalProps: HTMLProps) => {
    const {
      render: _render,
      className: _className,
      validate: _validate,
      validationDebounceTime: _validationDebounceTime,
      validationMode: _validationMode,
      name: _name,
      disabled: _disabled,
      invalid: _invalid,
      dirty: _dirty,
      touched: _touched,
      actionsRef: _actionsRef,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return mergeProps(externalProps, elementProps) as HTMLProps;
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    state,
    props: [getElementProps],
    stateAttributesMapping: fieldValidityMapping,
  });

  return (
    <FieldRootContext.Provider value={contextValue}>{getElement()}</FieldRootContext.Provider>
  );
}

/**
 * Groups all parts of the field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldRoot(componentProps: FieldRoot.Props) {
  return (
    <LabelableProvider>
      <FieldRootInner {...componentProps} />
    </LabelableProvider>
  );
}

export interface FieldValidityData {
  state: {
    badInput: boolean;
    customError: boolean;
    patternMismatch: boolean;
    rangeOverflow: boolean;
    rangeUnderflow: boolean;
    stepMismatch: boolean;
    tooLong: boolean;
    tooShort: boolean;
    typeMismatch: boolean;
    valueMissing: boolean;
    valid: boolean | null;
  };
  error: string;
  errors: string[];
  value: unknown;
  initialValue: unknown;
}

export interface FieldRootActions {
  validate: () => void;
}

export interface FieldRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the field has been touched.
   */
  touched: boolean;
  /**
   * Whether the field value has changed from its initial value.
   */
  dirty: boolean;
  /**
   * Whether the field is valid.
   */
  valid: boolean | null;
  /**
   * Whether the field has a value.
   */
  filled: boolean;
  /**
   * Whether the field is focused.
   */
  focused: boolean;
}

export interface FieldRootProps extends BaseUIComponentProps<'div', FieldRootState> {
  /**
   * Whether the component should ignore user interaction.
   * Takes precedence over the `disabled` prop on the `<Field.Control>` component.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   * Takes precedence over the `name` prop on the `<Field.Control>` component.
   */
  name?: string | undefined;
  /**
   * A function for custom validation. Return a string or an array of strings with
   * the error message(s) if the value is invalid. Returning nothing, `null`, an empty
   * string, or an empty array means the value is valid.
   * Asynchronous functions are supported, but they do not prevent form submission
   * when using `validationMode="onSubmit"`.
   */
  validate?:
    | ((
        value: unknown,
        formValues: Form.Values,
      ) => string | string[] | null | void | Promise<string | string[] | null | void>)
    | undefined;
  /**
   * Determines when the field should be validated.
   * This takes precedence over the `validationMode` prop on `<Form>`.
   *
   * - `onSubmit`: triggers validation when the form is submitted, and re-validates on change after submission.
   * - `onBlur`: triggers validation when the control loses focus.
   * - `onChange`: triggers validation on every change to the control value.
   *
   * @default 'onSubmit'
   */
  validationMode?: Form.ValidationMode | undefined;
  /**
   * How long to wait between `validate` callbacks if
   * `validationMode="onChange"` is used. Specified in milliseconds.
   * @default 0
   */
  validationDebounceTime?: number | undefined;
  /**
   * Whether the field is invalid.
   * Useful when the field state is controlled by an external library.
   */
  invalid?: boolean | undefined;
  /**
   * Whether the field's value has been changed from its initial value.
   * Useful when the field state is controlled by an external library.
   */
  dirty?: boolean | undefined;
  /**
   * Whether the field has been touched.
   * Useful when the field state is controlled by an external library.
   */
  touched?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `validate`: Validates the field when called.
   */
  actionsRef?: RefObject<FieldRoot.Actions | null> | undefined;
}

export namespace FieldRoot {
  export type State = FieldRootState;
  export type Props = FieldRootProps;
  export type Actions = FieldRootActions;
}

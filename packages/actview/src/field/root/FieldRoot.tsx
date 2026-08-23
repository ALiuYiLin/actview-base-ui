import { computed, defineComponent, ref, toValue, useRootElement, watch } from 'actview';
import type { ComputedRef } from 'actview';
import { FieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import type { FieldRootContext as FieldRootContextValue } from '@/internals/field-root-context/FieldRootContext';
import { DEFAULT_VALIDITY_STATE, fieldValidityMapping } from '@/internals/field-constants/constants';
import { useFieldsetRootContext } from '@/fieldset/root/FieldsetRootContext';
import { useFormContext } from '@/internals/form-context/FormContext';
import { LabelableProvider } from '@/internals/labelable-provider';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useFieldValidation } from './useFieldValidation';
import { useFieldControlRegistration } from '@/internals/field-register-control/useFieldControlRegistration';

/**
 * @internal
 */
const FieldRootInner = defineComponent(function (componentProps: FieldRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const {errors, validationMode: formValidationMode, submitAttemptedRef} = toValue(useFormContext());

  const disabledFieldset = useFieldsetRootContext(true).value?.disabled;

  // toValue 会把函数型 prop 当 getter 调用——validate 是函数 prop，直接读取
  const validateProp = componentProps.validate;
  const validationDebounceTime = toValue(componentProps.validationDebounceTime) ?? 0;
  const validationMode = toValue(componentProps.validationMode) ?? formValidationMode;
  const name = toValue(componentProps.name);
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const invalidProp = toValue(componentProps.invalid);
  const dirtyProp = toValue(componentProps.dirty);
  const touchedProp = toValue(componentProps.touched);

  type NonUndefinedValidate = Exclude<FieldRoot.Props['validate'], undefined>;
  const validate = (validateProp || (() => null)) as NonUndefinedValidate;

  const disabled = disabledFieldset || disabledProp;

  const touchedState = ref(false);
  const dirtyState = ref(false);
  const filled = ref(false);
  const focused = ref(false);

  const dirty = computed(() => dirtyProp ?? dirtyState.value);
  const touched = computed(() => touchedProp ?? touchedState.value);

  const markedDirtyRef = {current: dirty.value};
  const registeredFieldIdRef = {current: undefined as string | undefined};
  const registeredFieldName = ref<string | undefined>(undefined);
  const effectiveName = computed(() => name ?? registeredFieldName.value);

  // 受控 dirtyProp 变化时同步 markedDirtyRef（React 版 useIsoLayoutEffect 等价物）
  watch(
    () => dirtyProp,
    (v) => {
      if (v !== undefined) {
        markedDirtyRef.current = v;
      }
    },
    {immediate: true},
  );

  const setDirty = (value: boolean | ((prev: boolean) => boolean)) => {
    if (dirtyProp !== undefined) {
      return;
    }

    const next = typeof value === 'function' ? value(dirtyState.value) : value;
    if (next) {
      markedDirtyRef.current = true;
    }
    dirtyState.value = next;
  };

  const setTouched = (value: boolean | ((prev: boolean) => boolean)) => {
    if (touchedProp !== undefined) {
      return;
    }
    touchedState.value = typeof value === 'function' ? value(touchedState.value) : value;
  };

  const setFilled = (value: boolean | ((prev: boolean) => boolean)) => {
    filled.value = typeof value === 'function' ? value(filled.value) : value;
  };

  const setFocused = (value: boolean | ((prev: boolean) => boolean)) => {
    focused.value = typeof value === 'function' ? value(focused.value) : value;
  };

  const shouldValidateOnChange = () =>
    validationMode === 'onChange' ||
    (validationMode === 'onSubmit' && submitAttemptedRef.current);

  const formError = computed(() => {
    const fieldName = effectiveName.value;
    return fieldName && Object.hasOwn(errors, fieldName) ? errors[fieldName] : null;
  });
  const hasFormError = computed(() =>
    !!(Array.isArray(formError.value) ? formError.value.length : formError.value),
  );
  const invalid = computed(() => invalidProp === true || hasFormError.value);

  const validityDataState = ref<FieldValidityData>({
    state: DEFAULT_VALIDITY_STATE,
    error: '',
    errors: [],
    value: null,
    initialValue: null,
  });
  const validityData = computed(() => validityDataState.value);
  const setValidityData = (
    data: FieldValidityData | ((prev: FieldValidityData) => FieldValidityData),
  ) => {
    validityDataState.value =
      typeof data === 'function' ? data(validityDataState.value) : data;
  };

  // App-controlled invalidity (the `invalid` prop and `<Form>` errors) keeps the field marked
  // invalid even while disabled. Only computed validity (native constraints and `validate`)
  // is suppressed when disabled, matching `:disabled` not participating in constraint validation.
  const valid = computed(() => !invalid.value && (disabled ? null : validityData.value.state.valid));

  const state = computed<FieldRootState>(() => ({
    disabled,
    touched: touched.value,
    dirty: dirty.value,
    valid: valid.value,
    filled: filled.value,
    focused: focused.value,
  }));

  const validation = useFieldValidation({
    setValidityData,
    validate,
    validityData,
    validationDebounceTime,
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
    name,
    setRegisteredFieldName: (v) => (registeredFieldName.value = v),
    registeredFieldIdRef,
    setValidityData,
    validityData,
  });

  // React 版 useImperativeHandle 等价物：actionsRef 就绪后写入 validate
  watch(
    () => toValue(componentProps.actionsRef),
    (actionsRefObj) => {
      if (actionsRefObj) {
        (actionsRefObj as any).value = {validate: validateFieldControl};
      }
    },
    {immediate: true},
  );

  const contextValue: FieldRootContextValue = {
    invalid,
    name: effectiveName,
    validityData,
    setValidityData,
    disabled: computed(() => disabled),
    setTouched,
    setDirty,
    setFilled,
    setFocused,
    validationMode: computed(() => validationMode),
    shouldValidateOnChange,
    state,
    registerFieldControl,
    validation,
  };

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = state.value;
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
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

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: rootRef});
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <div {...merged} ref={rootRef} />;
    }

    return <FieldRootContext.Provider value={contextValue}>{element}</FieldRootContext.Provider>;
  };
}) as unknown as (props: FieldRoot.Props) => JSX.Element;

/**
 * Groups all parts of the field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldRoot = defineComponent(function (componentProps: FieldRoot.Props) {
  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    return <LabelableProvider>{<FieldRootInner {...(componentProps as any)} />}</LabelableProvider>;
  };
}) as unknown as (props: FieldRoot.Props) => JSX.Element;

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
        formValues: Record<string, unknown>,
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
  validationMode?: 'onSubmit' | 'onBlur' | 'onChange' | undefined;
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
  actionsRef?: {current: FieldRoot.Actions | null} | undefined;
}

export namespace FieldRoot {
  export type State = FieldRootState;
  export type Props = FieldRootProps;
  export type Actions = FieldRootActions;
}

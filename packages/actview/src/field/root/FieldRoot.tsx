import {computed, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import { FieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import type { FieldRootContext as FieldRootContextValue } from '@/internals/field-root-context/FieldRootContext';
import { DEFAULT_VALIDITY_STATE, fieldValidityMapping } from '@/internals/field-constants/constants';
import { useFieldsetRootContext } from '@/fieldset/root/FieldsetRootContext';
import { useFormContext } from '@/internals/form-context/FormContext';
import { LabelableProvider } from '@/internals/labelable-provider';
import type { BaseUIComponentProps } from '@/internals/types';
import { useFieldValidation } from './useFieldValidation';
import { useFieldControlRegistration } from '@/internals/field-register-control/useFieldControlRegistration';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * @internal
 */
function FieldRootInner(componentProps: FieldRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElement）。
  const rootRef = ref(null as HTMLElement | null);

  const {errors, validationMode: formValidationMode, submitAttemptedRef} = useFormContext();

  // context 载体直取（store-as-is）；fieldset disabled 为 plain boolean 字段。
  const fieldsetContext = useFieldsetRootContext(true);
  const disabledFieldset = computed(() => fieldsetContext?.disabled);
  const disabled = computed(
    () => disabledFieldset.value || (componentProps.disabled ?? false),
  );

  // 渲染期/事件期消费的 props：computed/getter 直读（setup 快照会停留在首渲染）。
  const name = computed(() => componentProps.name);
  const invalidProp = computed(() => componentProps.invalid);
  const dirtyProp = computed(() => componentProps.dirty);
  const touchedProp = computed(() => componentProps.touched);
  const validationDebounceTime = () => componentProps.validationDebounceTime ?? 0;
  const validationMode = () => componentProps.validationMode ?? formValidationMode;

  // validate 是函数 prop——事件期直读（包装一层，避免 setup 快照）。
  const validate = (value: unknown, formValues: Record<string, unknown>) =>
    (componentProps.validate ?? (() => null))(value, formValues);

  const touchedState = ref(false);
  const dirtyState = ref(false);
  const filled = ref(false);
  const focused = ref(false);

  const dirty = computed(() => dirtyProp.value ?? dirtyState.value);
  const touched = computed(() => touchedProp.value ?? touchedState.value);

  const markedDirtyRef = ref(dirty.value);
  const registeredFieldIdRef = ref(undefined as string | undefined);
  const registeredFieldName = ref<string | undefined>(undefined);
  const effectiveName = computed(() => name.value ?? registeredFieldName.value);

  // 受控 dirtyProp 变化时同步 markedDirtyRef（React 版 useIsoLayoutEffect 等价物）
  watch(
    dirtyProp,
    (v) => {
      if (v !== undefined) {
        markedDirtyRef.value = v;
      }
    },
    {immediate: true},
  );

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  const setDirty = (value: boolean | ((prev: boolean) => boolean)) => {
    if (dirtyProp.value !== undefined) {
      return;
    }

    const next = typeof value === 'function' ? value(dirtyState.value) : value;
    if (next) {
      markedDirtyRef.value = true;
    }
    dirtyState.value = next;
  };

  const setTouched = (value: boolean | ((prev: boolean) => boolean)) => {
    if (touchedProp.value !== undefined) {
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
    validationMode() === 'onChange' ||
    (validationMode() === 'onSubmit' && submitAttemptedRef.value);

  const formError = computed(() => {
    const fieldName = effectiveName.value;
    return fieldName && Object.hasOwn(errors, fieldName) ? errors[fieldName] : null;
  });
  const hasFormError = computed(() =>
    !!(Array.isArray(formError.value) ? formError.value.length : formError.value),
  );
  const invalid = computed(() => invalidProp.value === true || hasFormError.value);

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
  const valid = computed(() => !invalid.value && (disabled.value ? null : validityData.value.state.valid));

  const state = computed<FieldRootState>(() => ({
    disabled: disabled.value,
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
    name: () => componentProps.name,
    setRegisteredFieldName: (v) => (registeredFieldName.value = v),
    registeredFieldIdRef,
    setValidityData,
    validityData,
  });

  // React 版 useImperativeHandle 等价物：actionsRef 就绪后写入 validate
  watch(
    () => componentProps.actionsRef,
    (actionsRefObj) => {
      if (actionsRefObj) {
        (actionsRefObj as any).value = {validate: validateFieldControl};
      }
    },
    {immediate: true},
  );

  // store-as-is 载体：身份稳定（setup 构建一次），ComputedRef 字段渲染期 `.value`
  // 求值——消费端读字段即追踪，不存在冻结快照。
  const contextValue: FieldRootContextValue = {
    invalid,
    name: effectiveName,
    validityData,
    setValidityData,
    disabled: computed(() => disabled.value),
    setTouched,
    setDirty,
    setFilled,
    setFocused,
    validationMode: computed(() => validationMode()),
    shouldValidateOnChange,
    state,
    registerFieldControl,
    validation,
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // 组件自定义 props（disabled/name/validate/validationMode/validationDebounceTime/
  // invalid）剔除——否则泄漏到 DOM。
  const {
    className,
    render,
    style,
    disabled: _disabled,
    name: _name,
    validate: _validate,
    validationMode: _validationMode,
    validationDebounceTime: _validationDebounceTime,
    invalid: _invalid,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <FieldRootContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: fieldValidityMapping,
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: elementProps.value,
        },
      )}
    </FieldRootContext.Provider>
  );
}

/**
 * Groups all parts of the field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldRoot(componentProps: FieldRoot.Props) {
  // LabelableProvider 在上层注入 labelable 作用域（Inner 及其子组件消费）。
  return (
    <LabelableProvider>
      <FieldRootInner {...(componentProps as any)} />
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
  actionsRef?: Ref<FieldRoot.Actions | null> | undefined;
}

export namespace FieldRoot {
  export type State = FieldRootState;
  export type Props = FieldRootProps;
  export type Actions = FieldRootActions;
}

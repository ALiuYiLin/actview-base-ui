import { computed, createContext, ref } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import { NOOP } from '@/internals/noop';
import { DEFAULT_FIELD_ROOT_STATE, DEFAULT_VALIDITY_STATE } from '@/internals/field-constants/constants';
import type { HTMLProps } from '@/internals/types';
import type { ValidationMode } from '@/internals/form-context/FormContext';
import type { FieldValidityData } from '@/field/root/FieldRoot';
import type { UseFieldValidationReturnValue } from '@/field/root/useFieldValidation';

export interface FieldRootState {
  disabled: boolean;
  valid: boolean | null;
  touched: boolean;
  dirty: boolean;
  filled: boolean;
  focused: boolean;
}

export interface FieldControlRegistration {
  controlRef: Ref<any>;
  id: string | undefined;
  name?: string | undefined;
  getValue?: (() => unknown) | undefined;
  value: unknown;
}

export interface FieldRootContext {
  invalid: ComputedRef<boolean | undefined>;
  name: ComputedRef<string | undefined>;
  validityData: ComputedRef<FieldValidityData>;
  setValidityData: (
    updater: FieldValidityData | ((prev: FieldValidityData) => FieldValidityData),
  ) => void;
  disabled: ComputedRef<boolean | undefined>;
  setTouched: (v: boolean | ((prev: boolean) => boolean)) => void;
  setDirty: (v: boolean | ((prev: boolean) => boolean)) => void;
  setFilled: (v: boolean | ((prev: boolean) => boolean)) => void;
  setFocused: (v: boolean | ((prev: boolean) => boolean)) => void;
  validationMode: ComputedRef<ValidationMode>;
  shouldValidateOnChange: () => boolean;
  state: ComputedRef<FieldRootState>;
  registerFieldControl: (
    source: symbol,
    registration: FieldControlRegistration | undefined,
  ) => void;
  validation: UseFieldValidationReturnValue;
}

export const DEFAULT_FIELD_ROOT_CONTEXT: FieldRootContext = {
  invalid: computed(() => undefined),
  name: computed(() => undefined),
  validityData: computed(() => ({
    state: DEFAULT_VALIDITY_STATE,
    errors: [],
    error: '',
    value: '',
    initialValue: null,
  })),
  setValidityData: NOOP,
  disabled: computed(() => undefined),
  setTouched: NOOP,
  setDirty: NOOP,
  setFilled: NOOP,
  setFocused: NOOP,
  validationMode: computed(() => 'onSubmit'),
  shouldValidateOnChange: () => false,
  state: computed(() => DEFAULT_FIELD_ROOT_STATE),
  registerFieldControl: NOOP,
  validation: {
    getValidationProps: (_disabled: boolean, props: HTMLProps = {}) => props,
    inputRef: ref(null),
    registeredInputs: new Map(),
    registerInput: NOOP,
    getInputControl: () => null,
    commit: async () => {},
    change: NOOP,
  },
};

export const FieldRootContext = createContext<FieldRootContext>(DEFAULT_FIELD_ROOT_CONTEXT);

export function useFieldRootContext(optional = true) {
  const context = FieldRootContext.use();

  if (context.value.setValidityData === NOOP && !optional) {
    throw new Error(
      'Base UI: FieldRootContext is missing. Field parts must be placed within <Field.Root>.',
    );
  }

  return context;
}

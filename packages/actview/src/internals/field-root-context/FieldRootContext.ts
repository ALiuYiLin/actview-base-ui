import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { NOOP } from '../noop';
import { DEFAULT_FIELD_ROOT_STATE, DEFAULT_VALIDITY_STATE } from '../field-constants/constants';
import type { FieldValidityData, FieldRootState } from '../../field/root/FieldRoot';
import type { Form } from '../../form';
import type { UseFieldValidationReturnValue } from '../../field/root/useFieldValidation';
import type { HTMLProps } from '../types';
import type { FieldControlRegistration } from '../field-register-control/useFieldControlRegistration';
import { createContext } from '../createContext';

export interface FieldRootContext {
  invalid: boolean | undefined;
  name: string | undefined;
  validityData: FieldValidityData;
  setValidityData: (data: FieldValidityData) => void;
  disabled: boolean | undefined;
  setTouched: (value: boolean) => void;
  setDirty: (value: boolean) => void;
  setFilled: (value: boolean) => void;
  setFocused: (value: boolean) => void;
  validationMode: Form.ValidationMode;
  shouldValidateOnChange: () => boolean;
  state: FieldRootState;
  registerFieldControl: (
    source: symbol,
    registration: FieldControlRegistration | undefined,
  ) => void;
  validation: UseFieldValidationReturnValue;
}

export const DEFAULT_FIELD_ROOT_CONTEXT: FieldRootContext = {
  invalid: undefined,
  name: undefined,
  validityData: {
    state: DEFAULT_VALIDITY_STATE,
    errors: [],
    error: '',
    value: '',
    initialValue: null,
  },
  setValidityData: NOOP,
  disabled: undefined,
  setTouched: NOOP,
  setDirty: NOOP,
  setFilled: NOOP,
  setFocused: NOOP,
  validationMode: 'onSubmit',
  shouldValidateOnChange: () => false,
  state: DEFAULT_FIELD_ROOT_STATE,
  registerFieldControl: NOOP,
  validation: {
    getValidationProps: (_disabled: boolean, props: HTMLProps = EMPTY_OBJECT) => props,
    inputRef: { current: null },
    registeredInputs: new Map(),
    registerInput: NOOP,
    getInputControl: () => null,
    commit: async () => {},
    change: NOOP,
  },
};

export const FieldRootContext = createContext<FieldRootContext>(
  'base-ui-field-root-context',
  DEFAULT_FIELD_ROOT_CONTEXT,
);

export function useFieldRootContext(optional = true) {
  const context = FieldRootContext.use();

  if (context.value.setValidityData === NOOP && !optional) {
    throw new Error(
      'Base UI: FieldRootContext is missing. Field parts must be placed within <Field.Root>.',
    );
  }

  return context;
}

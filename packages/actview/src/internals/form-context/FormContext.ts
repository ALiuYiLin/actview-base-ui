import { createContext } from 'actview';
import { NOOP } from '@/internals/noop';

export type Errors = Record<string, string | string[]>;

export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FieldValidityData {
  state: Record<string, boolean | null>;
  errors: string[];
  error: string;
  value: unknown;
  initialValue: unknown;
}

export interface FormFieldRegistration {
  name: string | undefined;
  /**
   * After this returns, the field registry entry reflects the latest synchronous
   * validity verdict. Async validators do not block submit.
   */
  validate: () => void;
  validityData: FieldValidityData;
  controlRef: {current: HTMLElement | null};
  getValue: () => unknown;
}

export interface FormContext {
  errors: Errors;
  clearErrors: (name: string | undefined) => void;
  elementRef: {current: HTMLFormElement | null};
  formRef: {
    current: {
      fields: Map<string, FormFieldRegistration>;
    };
  };
  validationMode: ValidationMode;
  submitAttemptedRef: {current: boolean};
}

export const FormContext = createContext<FormContext>({
  elementRef: {current: null},
  formRef: {
    current: {
      fields: new Map(),
    },
  },
  errors: {},
  clearErrors: NOOP,
  validationMode: 'onSubmit',
  submitAttemptedRef: {
    current: false,
  },
});

export function useFormContext() {
  return FormContext.use();
}

import type { FieldValidityData } from '../../field/root/FieldRoot';
import { NOOP } from '../noop';
import type { Form } from '../../form';
import type { RefObject } from '../types';
import { createContext } from '../createContext';

export type Errors = Record<string, string | string[]>;

export interface FormContext {
  errors: Errors;
  clearErrors: (name: string | undefined) => void;
  elementRef: RefObject<HTMLFormElement | null>;
  formRef: RefObject<{
    fields: Map<
      string,
      {
        name: string | undefined;
        /**
         * After this returns, the field registry entry reflects the latest synchronous
         * validity verdict. Async validators do not block submit.
         */
        validate: () => void;
        validityData: FieldValidityData;
        controlRef: RefObject<HTMLElement | null>;
        getValue: () => unknown;
      }
    >;
  }>;
  validationMode: Form.ValidationMode;
  submitAttemptedRef: RefObject<boolean>;
}

export const FormContext = createContext<FormContext>('base-ui-form-context', {
  elementRef: { current: null },
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

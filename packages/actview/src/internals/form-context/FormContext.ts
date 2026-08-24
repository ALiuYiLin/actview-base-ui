import { createContext, ref, shallowRef } from 'actview';
import { NOOP } from '@/internals/noop';
import type { FieldValidityData } from '@/field/root/FieldRoot';
import type { Ref } from 'actview';

export type Errors = Record<string, string | string[]>;

export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormFieldRegistration {
  name: string | undefined;
  /**
   * After this returns, the field registry entry reflects the latest synchronous
   * validity verdict. Async validators do not block submit.
   */
  validate: () => void;
  validityData: FieldValidityData;
  controlRef: Ref<HTMLElement | null>;
  getValue: () => unknown;
}

export interface FormContext {
  errors: Errors;
  clearErrors: (name: string | undefined) => void;
  elementRef: Ref<HTMLFormElement | null>;
  formRef: Ref<{
    fields: Map<string, FormFieldRegistration>;
  }>;
  validationMode: ValidationMode;
  submitAttemptedRef: Ref<boolean>;
}

export const FormContext = createContext<FormContext>({
  elementRef: ref(null),
  formRef: shallowRef({
    fields: new Map(),
  }),
  errors: {},
  clearErrors: NOOP,
  validationMode: 'onSubmit',
  submitAttemptedRef: ref(false),
});

export function useFormContext() {
  return FormContext.use();
}

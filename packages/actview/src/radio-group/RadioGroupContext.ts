import { createContext } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { UseFieldValidationReturnValue } from '@/field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';

export interface RadioGroupContext<Value> {
  disabled: ComputedRef<boolean>;
  readOnly: boolean | undefined;
  required: boolean | undefined;
  form: string | undefined;
  name: string | undefined;
  checkedValue: ComputedRef<Value | undefined>;
  setCheckedValue: (
    value: Value,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  touched: Ref<boolean>;
  setTouched: (value: boolean) => void;
  validation?: UseFieldValidationReturnValue | undefined;
  registerInputRef: (element: HTMLInputElement | null) => void;
}

export const RadioGroupContext = createContext<RadioGroupContext<any> | undefined>(undefined);

export function useRadioGroupContext(): Ref<RadioGroupContext<any> | undefined> {
  return RadioGroupContext.use();
}

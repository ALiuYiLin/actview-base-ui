import { createContext } from 'actview';
import type { ComputedRef } from 'actview';
import type { UseFieldValidationReturnValue } from '@/field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';

export interface RadioGroupContext<Value> {
  disabled: ComputedRef<boolean>;
  readOnly: ComputedRef<boolean | undefined>;
  required: ComputedRef<boolean | undefined>;
  form: ComputedRef<string | undefined>;
  name: ComputedRef<string | undefined>;
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

export function useRadioGroupContext(): RadioGroupContext<any> | undefined {
  return RadioGroupContext.use();
}

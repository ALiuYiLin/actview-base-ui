import type { ComputedRef } from '@actview/core';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';
import { createContext } from '../internals/createContext';

export interface RadioGroupContext<Value> {
  disabled: boolean | undefined;
  readOnly: boolean | undefined;
  required: boolean | undefined;
  form: string | undefined;
  name: string | undefined;
  checkedValue: Value | undefined;
  setCheckedValue: (
    value: Value,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  touched: boolean;
  setTouched: (value: boolean) => void;
  validation?: UseFieldValidationReturnValue | undefined;
  registerInputRef: (element: HTMLInputElement | null) => void | (() => void);
}

export const RadioGroupContext = createContext<RadioGroupContext<any> | undefined>(
  'base-ui-radio-group-context',
  undefined,
);

export function useRadioGroupContext() {
  return RadioGroupContext.use() as ComputedRef<RadioGroupContext<any> | undefined>;
}

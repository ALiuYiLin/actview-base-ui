import type { ComputedRef } from '@actview/core';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';
import { createContext } from 'actview';

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

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期/惰性读 .value 建立响应式追踪（对照 MeterRootContext，
// 案例 5）——radio 家族（未重构）读 `.value` 零改动兼容。
export const RadioGroupContext = createContext<RadioGroupContext<any> | undefined>(undefined);

export function useRadioGroupContext() {
  return RadioGroupContext.use() as ComputedRef<RadioGroupContext<any> | undefined>;
}

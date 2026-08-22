import type { ComputedRef } from '@actview/core';
import type { UseFieldValidationReturnValue } from '@/field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';
import { createContext } from '@/internals/createContext';

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

// internals createContext（computed 包裹）：消费方读 .value 时同步重算——事件回调
// （onFocus 等同步执行）里读 context 能立即拿到最新值。actview 官方 createContext
// 的 Provider 用 watch（pre flush 微任务）同步 value prop → state ref，消费方读到的
// 值滞后一个微任务：Arrow 键导航的 focus 在 queueMicrotask 里触发，此时 watch 未跑，
// touched 读到旧值 → 自动选中失败（PD-16：context 传播时序）。
export const RadioGroupContext = createContext<RadioGroupContext<any> | undefined>(
  'base-ui-radio-group-context',
  undefined,
);

export function useRadioGroupContext() {
  return RadioGroupContext.use() as ComputedRef<RadioGroupContext<any> | undefined>;
}

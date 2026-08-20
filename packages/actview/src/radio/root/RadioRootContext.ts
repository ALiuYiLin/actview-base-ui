import type { ComputedRef } from '@actview/core';
import type { RadioRootState } from './RadioRoot';
import { createContext } from 'actview';

export type RadioRootContext = RadioRootState;

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期/惰性读 .value 建立响应式追踪（对照 MeterRootContext，
// 案例 5）。此 context 的值就是 RadioRoot 的 state（React 版同款：contextValue = state）
export const RadioRootContext = createContext<RadioRootContext | undefined>(undefined);

export function useRadioRootContext() {
  const value = RadioRootContext.use();
  if (value.value === undefined) {
    throw new Error(
      'Base UI: RadioRootContext is missing. Radio parts must be placed within <Radio.Root>.',
    );
  }

  return value as ComputedRef<RadioRootContext>;
}

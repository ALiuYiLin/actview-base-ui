import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export type MeterRootContext = {
  formattedValue: string;
  /**
   * The value normalized to a `0`–`100` percentage of the range, clamped to those bounds.
   */
  percentageValue: number;
  setLabelId: (id: string | undefined) => void;
  value: number;
};

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期读 .value 建立响应式追踪（对照 ToggleGroupContext）
export const MeterRootContext = createContext<MeterRootContext | undefined>(undefined);

export function useMeterRootContext(): ComputedRef<MeterRootContext> {
  // `use()` 必须在 setup 调用（依赖 useInjects），渲染期读 .value 追踪
  const context = MeterRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
    );
  }

  return context as ComputedRef<MeterRootContext>;
}

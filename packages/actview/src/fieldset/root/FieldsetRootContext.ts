import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export interface FieldsetRootContext {
  legendId: string | undefined;
  setLegendId: (id: string | undefined) => void;
  disabled: boolean;
}

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期/惰性读 .value 建立响应式追踪（对照 MeterRootContext，
// 案例 5）——消费方（FieldRoot/RadioGroup 的 `fieldsetContext.value?.disabled`）零改动兼容。
export const FieldsetRootContext = createContext<FieldsetRootContext | undefined>(undefined);

export function useFieldsetRootContext(optional: true): ComputedRef<FieldsetRootContext | undefined>;
export function useFieldsetRootContext(optional?: false): ComputedRef<FieldsetRootContext>;
export function useFieldsetRootContext(optional = false) {
  const context = FieldsetRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  }
  return context;
}

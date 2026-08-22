import type { ComputedRef } from '@actview/core';
import type { Orientation } from '@/internals/types';
import { createContext } from 'actview';

export interface ToolbarRootContext {
  disabled: boolean;
  orientation: Orientation;
}

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期读 .value 建立响应式追踪（对照 ToggleGroupContext）
export const ToolbarRootContext = createContext<ToolbarRootContext | undefined>(undefined);

export function useToolbarRootContext(optional?: false): ComputedRef<ToolbarRootContext>;
export function useToolbarRootContext(optional: true): ComputedRef<ToolbarRootContext | undefined>;
export function useToolbarRootContext(
  optional = false,
): ComputedRef<ToolbarRootContext | undefined> {
  const context = ToolbarRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
    );
  }

  return context;
}

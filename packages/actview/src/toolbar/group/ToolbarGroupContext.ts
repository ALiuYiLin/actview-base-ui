import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export interface ToolbarGroupContext {
  disabled: boolean;
}

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期读 .value 建立响应式追踪（对照 ToggleGroupContext）
export const ToolbarGroupContext = createContext<ToolbarGroupContext | undefined>(undefined);

export function useToolbarGroupContext(): ComputedRef<ToolbarGroupContext | undefined> {
  return ToolbarGroupContext.use();
}

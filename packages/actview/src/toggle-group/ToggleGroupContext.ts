import type { ComputedRef } from '@actview/core';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';
import { createContext } from 'actview'   // 框架 API（替代 ../internals/createContext）

export interface ToggleGroupContext<Value> {
  value: readonly Value[]
  setGroupValue: (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void
  disabled: boolean
  /** 值是否已通过 value/defaultValue 初始化（Toggle 警告数据不一致用） */
  isValueInitialized: boolean
}

export const ToggleGroupContext = createContext<ToggleGroupContext<any> | undefined>(undefined)
//                                            ↑ 只有 defaultValue 一个参数

export function useToggleGroupContext<Value>() {
  // 框架 use() 返回 Ref（无 Provider 时返回默认值 ref，.value 为 undefined）
  return ToggleGroupContext.use() as ComputedRef<ToggleGroupContext<Value> | undefined>
}

import { createContext } from 'actview';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';

export interface ToggleGroupContext<Value> {
  /** 当前按下的 value 数组（getter 载体直出数组，消费端直读即追踪） */
  value: readonly Value[];
  setGroupValue: (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  disabled: boolean;
  /**
   * Indicates whether the value has been initialized via `value` or `defaultValue` props.
   * Used to determine if Toggle should warn users about data inconsistency problems.
   */
  isValueInitialized: boolean;
}

export const ToggleGroupContext = createContext<ToggleGroupContext<any> | undefined>(undefined);

export function useToggleGroupContext<Value>(): ToggleGroupContext<Value> | undefined {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined）。
  return ToggleGroupContext.use();
}

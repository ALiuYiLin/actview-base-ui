import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { ComputedRef } from 'actview';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';

export interface ToggleGroupContext<Value> {
  value: ComputedRef<readonly Value[]>;
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

export function useToggleGroupContext<Value>(): Ref<ToggleGroupContext<Value> | undefined> {
  return ToggleGroupContext.use();
}

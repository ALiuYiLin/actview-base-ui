import type { ComputedRef } from '@actview/core';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';
import { createContext } from '../internals/createContext';

export interface ToggleGroupContext<Value> {
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

export const ToggleGroupContext = createContext<ToggleGroupContext<any> | undefined>(
  'base-ui-toggle-group-context',
  undefined,
);

export function useToggleGroupContext<Value>() {
  return ToggleGroupContext.use() as ComputedRef<ToggleGroupContext<Value> | undefined>;
}

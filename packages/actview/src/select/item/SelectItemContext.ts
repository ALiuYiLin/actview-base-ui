import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

export interface SelectItemContext {
  selected: boolean;
  index: number;
  textRef: { current?: HTMLElement | null };
  selectedByFocus: boolean;
}

export const SelectItemContext = createContext<SelectItemContext | undefined>(
  'base-ui-select-item-context',
  undefined,
);

export function useSelectItemContext(): ComputedRef<SelectItemContext> {
  const context = SelectItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SelectItemContext is missing. SelectItem parts must be placed within <Select.Item>.',
    );
  }
  return context as ComputedRef<SelectItemContext>;
}

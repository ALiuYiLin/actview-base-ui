import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

export interface ComboboxItemContext {
  selected: boolean;
  textRef: { current: HTMLElement | null };
}

export const ComboboxItemContext = createContext<ComboboxItemContext | undefined>(
  'base-ui-combobox-item-context',
  undefined,
);

export function useComboboxItemContext(): ComputedRef<ComboboxItemContext> {
  const context = ComboboxItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ComboboxItemContext is missing. ComboboxItem parts must be placed within <Combobox.Item>.',
    );
  }
  return context as ComputedRef<ComboboxItemContext>;
}

import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export interface ComboboxChipContext {
  index: number;
}

export const ComboboxChipContext = createContext<ComboboxChipContext | undefined>(undefined);

export function useComboboxChipContext(): ComputedRef<ComboboxChipContext> {
  const context = ComboboxChipContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ComboboxChipContext is missing. ComboboxChip parts must be placed within <Combobox.Chip>.',
    );
  }
  return context as ComputedRef<ComboboxChipContext>;
}

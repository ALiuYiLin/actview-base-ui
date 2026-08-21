import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export interface ComboboxGroupContext {
  labelId: string | undefined;
  setLabelId: (next: string | undefined | ((current: string | undefined) => string | undefined)) => void;
  /**
   * Optional list of items that belong to this group. Used by nested
   * collections to render group-specific items.
   */
  items?: readonly any[] | undefined;
}

export const ComboboxGroupContext = createContext<ComboboxGroupContext | undefined>(undefined);

export function useComboboxGroupContext(): ComputedRef<ComboboxGroupContext> {
  const context = ComboboxGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ComboboxGroupContext is missing. ComboboxGroup parts must be placed within <Combobox.Group>.',
    );
  }
  return context as ComputedRef<ComboboxGroupContext>;
}
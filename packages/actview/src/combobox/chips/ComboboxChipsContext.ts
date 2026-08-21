import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export interface ComboboxChipsContext {
  highlightedChipIndex: number | undefined;
  setHighlightedChipIndex: (next: number | undefined) => void;
  chipsRef: { current: Array<HTMLButtonElement | null> };
}

export const ComboboxChipsContext = createContext<ComboboxChipsContext | undefined>(undefined);

export function useComboboxChipsContext(): ComputedRef<ComboboxChipsContext | undefined> {
  return ComboboxChipsContext.use() as ComputedRef<ComboboxChipsContext | undefined>;
}

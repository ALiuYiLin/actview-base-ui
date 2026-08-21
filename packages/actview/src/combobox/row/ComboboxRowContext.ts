import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export const ComboboxRowContext = createContext<boolean>(false);

export function useComboboxRowContext(): ComputedRef<boolean> {
  return ComboboxRowContext.use() as ComputedRef<boolean>;
}

import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export const ComboboxRowContext = createContext<boolean>('base-ui-combobox-row-context', false);

export function useComboboxRowContext(): ComputedRef<boolean> {
  return ComboboxRowContext.use();
}

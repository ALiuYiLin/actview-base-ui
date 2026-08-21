import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export const ComboboxPortalContext = createContext<boolean | undefined>(undefined);

export function useComboboxPortalContext(): ComputedRef<boolean> {
  const context = ComboboxPortalContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: <Combobox.Portal> is missing.');
  }
  return context as ComputedRef<boolean>;
}
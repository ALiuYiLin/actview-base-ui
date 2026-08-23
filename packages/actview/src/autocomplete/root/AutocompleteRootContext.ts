import { createContext } from 'actview';
import type { ComputedRef } from 'actview';
import type { ComboboxStore } from '@/combobox/store';

export interface AutocompleteRootContextValue {
  store: ComboboxStore;
  inputValue: string;
  inputValueRef: {value: string};
  setInputValue: (value: string) => void;
  itemsRef: ComputedRef<any[]>;
  selectedValue: any;
}

export const AutocompleteRootContext = createContext<AutocompleteRootContextValue | undefined>(
  undefined,
);

export function useAutocompleteRootContext(optional = true): any {
  const context = AutocompleteRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Autocomplete.Root> is missing.');
  }
  return context.value;
}

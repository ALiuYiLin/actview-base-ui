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
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = AutocompleteRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Autocomplete.Root> is missing.');
  }
  return context;
}

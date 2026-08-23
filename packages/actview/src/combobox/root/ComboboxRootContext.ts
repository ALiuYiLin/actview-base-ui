import { createContext } from 'actview';
import type { ComputedRef } from 'actview';
import type { ComboboxStore } from '../store';

export interface ComboboxRootContextValue {
  store: ComboboxStore;
  inputValue: string;
  inputValueRef: {value: string};
  setInputValue: (value: string) => void;
  /**
   * actview 版：过滤后的 items（computed——响应式）。
   */
  itemsRef: ComputedRef<any[]>;
}

export const ComboboxRootContext = createContext<ComboboxRootContextValue | undefined>(undefined);

export function useComboboxRootContext(optional = true): any {
  const context = ComboboxRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Combobox.Root> is missing.');
  }
  return context.value;
}

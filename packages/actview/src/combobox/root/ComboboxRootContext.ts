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
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = ComboboxRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Combobox.Root> is missing.');
  }
  return context;
}

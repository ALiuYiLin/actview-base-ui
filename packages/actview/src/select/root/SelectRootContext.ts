import { createContext } from 'actview';
import type { SelectStore } from '../store';

export const SelectRootContext = createContext<SelectStore | undefined>(undefined);

export function useSelectRootContext(optional = true): any {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = SelectRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Select.Root> is missing.');
  }
  return context;
}

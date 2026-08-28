import { createContext } from 'actview';
import type { SelectStore } from '../store';

export const SelectRootContext = createContext<SelectStore | undefined>(undefined);

export function useSelectRootContext(optional = true): any {
  const context = SelectRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Select.Root> is missing.');
  }
  return context;
}

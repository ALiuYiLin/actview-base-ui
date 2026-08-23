import { createContext } from 'actview';

export interface SelectItemContextValue {
  selected: boolean;
  value: any;
}

export const SelectItemContext = createContext<SelectItemContextValue | undefined>(undefined);

export function useSelectItemContext(optional = true): any {
  const context = SelectItemContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Select.ItemIndicator> must be inside <Select.Item>.');
  }
  return context.value;
}

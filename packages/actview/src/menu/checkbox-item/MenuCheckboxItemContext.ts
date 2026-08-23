import { createContext } from 'actview';

export interface MenuCheckboxItemContextValue {
  checked: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export const MenuCheckboxItemContext = createContext<MenuCheckboxItemContextValue | undefined>(
  undefined,
);

export function useMenuCheckboxItemContext() {
  const context = MenuCheckboxItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuCheckboxItemContext is missing. MenuCheckboxItem parts must be placed within <Menu.CheckboxItem>.',
    );
  }
  return context.value;
}

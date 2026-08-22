import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

export interface MenuCheckboxItemContext {
  checked: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export const MenuCheckboxItemContext = createContext<MenuCheckboxItemContext | undefined>(
  'base-ui-menu-checkbox-item-context',
  undefined,
);

export function useMenuCheckboxItemContext(): ComputedRef<MenuCheckboxItemContext> {
  const context = MenuCheckboxItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuCheckboxItemContext is missing. MenuCheckboxItem parts must be placed within <Menu.CheckboxItem>.',
    );
  }

  return context as ComputedRef<MenuCheckboxItemContext>;
}

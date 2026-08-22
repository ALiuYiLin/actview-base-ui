import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

export interface MenuRadioItemContext {
  checked: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export const MenuRadioItemContext = createContext<MenuRadioItemContext | undefined>(
  'base-ui-menu-radio-item-context',
  undefined,
);

export function useMenuRadioItemContext(): ComputedRef<MenuRadioItemContext> {
  const context = MenuRadioItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuRadioItemContext is missing. MenuRadioItem parts must be placed within <Menu.RadioItem>.',
    );
  }

  return context as ComputedRef<MenuRadioItemContext>;
}

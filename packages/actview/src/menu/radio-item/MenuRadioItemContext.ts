import { createContext } from 'actview';

export interface MenuRadioItemContextValue {
  checked: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export const MenuRadioItemContext = createContext<MenuRadioItemContextValue | undefined>(
  undefined,
);

export function useMenuRadioItemContext() {
  const context = MenuRadioItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuRadioItemContext is missing. MenuRadioItem parts must be placed within <Menu.RadioItem>.',
    );
  }
  return context.value;
}

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
  // store-as-is：use() 原样返回注入的 getter 载体。
  const context = MenuRadioItemContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuRadioItemContext is missing. MenuRadioItem parts must be placed within <Menu.RadioItem>.',
    );
  }
  return context;
}

import { createContext } from 'actview';

export type MenuGroupContextValue = (
  value: string | undefined | ((current: string | undefined) => string | undefined),
) => void;

export const MenuGroupContext = createContext<MenuGroupContextValue | undefined>(undefined);

export function useMenuGroupRootContext() {
  // store-as-is：use() 原样返回注入的 setter 载体。
  const context = MenuGroupContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.',
    );
  }
  return context;
}

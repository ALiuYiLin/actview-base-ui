import { createContext } from 'actview';

export const MenuPortalContext = createContext<boolean | undefined>(undefined);

export function useMenuPortalContext(): boolean {
  // store-as-is：use() 原样返回注入值（keepMounted 布尔）。
  const value = MenuPortalContext.use();
  if (value === undefined) {
    throw new Error('Base UI: <Menu.Portal> is missing.');
  }
  return value;
}

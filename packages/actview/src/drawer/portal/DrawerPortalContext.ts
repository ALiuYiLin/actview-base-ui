import { createContext } from 'actview';

export const DrawerPortalContext = createContext<boolean | undefined>(undefined);

export function useDrawerPortalContext(): boolean {
  // store-as-is：use() 原样返回注入值（keepMounted 布尔）。
  const context = DrawerPortalContext.use();
  if (context === undefined) {
    throw new Error('Base UI: <Drawer.Portal> is missing.');
  }
  return context;
}

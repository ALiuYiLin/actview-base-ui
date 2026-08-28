import { createContext } from 'actview';

export type DrawerSwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface DrawerRootContextValue {
  swipeDirection: DrawerSwipeDirection;
}

export const DrawerRootContext = createContext<DrawerRootContextValue | undefined>(undefined);

export function useDrawerRootContext(optional = true) {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = DrawerRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Drawer.Root> is missing.');
  }
  return context;
}

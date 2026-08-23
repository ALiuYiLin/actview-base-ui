import { createContext } from 'actview';

export type DrawerSwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface DrawerRootContextValue {
  swipeDirection: DrawerSwipeDirection;
}

export const DrawerRootContext = createContext<DrawerRootContextValue | undefined>(undefined);

export function useDrawerRootContext(optional = true) {
  const context = DrawerRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Drawer.Root> is missing.');
  }
  return context.value;
}

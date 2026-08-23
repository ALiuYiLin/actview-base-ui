import { createContext } from 'actview';

export const DrawerPortalContext = createContext<boolean | undefined>(undefined);

export function useDialogPortalContext() {
  const context = DrawerPortalContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: <Drawer.Portal> is missing.');
  }
  return context.value;
}

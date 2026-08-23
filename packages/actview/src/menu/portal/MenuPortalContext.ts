import { createContext } from 'actview';

export const MenuPortalContext = createContext<boolean | undefined>(undefined);

export function useMenuPortalContext() {
  const value = MenuPortalContext.use();
  if (value.value === undefined) {
    throw new Error('Base UI: <Menu.Portal> is missing.');
  }
  return value.value;
}

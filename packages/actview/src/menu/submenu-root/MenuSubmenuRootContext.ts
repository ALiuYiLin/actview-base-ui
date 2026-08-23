import { createContext } from 'actview';
import type { MenuStore } from '../store/MenuStore';

export const MenuSubmenuRootContext = createContext<MenuSubmenuRootContext | undefined>(
  undefined,
);

export interface MenuSubmenuRootContext {
  parentMenu: MenuStore<unknown>;
}

export function useMenuSubmenuRootContext(): MenuSubmenuRootContext | undefined {
  const context = MenuSubmenuRootContext.use();
  return context.value;
}

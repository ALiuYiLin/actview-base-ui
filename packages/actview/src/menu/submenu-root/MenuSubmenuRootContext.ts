import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { MenuStore } from '../store/MenuStore';

export const MenuSubmenuRootContext = createContext<MenuSubmenuRootContext | undefined>(
  undefined,
);

export interface MenuSubmenuRootContext {
  parentMenu: MenuStore<unknown>;
}

export function useMenuSubmenuRootContext(): MenuSubmenuRootContext | undefined {
  return MenuSubmenuRootContext.use().value;
}

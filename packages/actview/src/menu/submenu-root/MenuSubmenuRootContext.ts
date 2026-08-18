import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { MenuStore } from '../store/MenuStore';

export const MenuSubmenuRootContext = createContext<MenuSubmenuRootContext | undefined>(
  'base-ui-menu-submenu-root-context',
  undefined,
);

export interface MenuSubmenuRootContext {
  parentMenu: MenuStore<unknown>;
}

export function useMenuSubmenuRootContext(): ComputedRef<MenuSubmenuRootContext | undefined> {
  return MenuSubmenuRootContext.use();
}

import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { MenuStore } from '../store/MenuStore';
import type { MenuParent } from './MenuRoot';

export interface MenuRootContext<Payload = unknown> {
  store: MenuStore<Payload>;
  parent: MenuParent;
}

export const MenuRootContext = createContext<MenuRootContext | undefined>(
  'base-ui-menu-root-context',
  undefined,
);

export function useMenuRootContext(optional?: false): ComputedRef<MenuRootContext>;
export function useMenuRootContext(optional: true): ComputedRef<MenuRootContext | undefined>;
export function useMenuRootContext(optional = true): ComputedRef<MenuRootContext | undefined> {
  const context = MenuRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: MenuRootContext is missing. Menu parts must be placed within <Menu.Root>.',
    );
  }

  return context as ComputedRef<MenuRootContext | undefined>;
}

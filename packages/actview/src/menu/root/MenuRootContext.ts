import { createContext } from 'actview';
import type { MenuStore } from '../store/MenuStore';
import type { MenuParent } from './MenuRoot';

export interface MenuRootContext<Payload = unknown> {
  store: MenuStore<Payload>;
  parent: MenuParent;
}

export const MenuRootContext = createContext<MenuRootContext | undefined>(undefined);

export function useMenuRootContext(optional?: false): MenuRootContext;
export function useMenuRootContext(optional: true): MenuRootContext | undefined;
export function useMenuRootContext(optional?: boolean) {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = MenuRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: MenuRootContext is missing. Menu parts must be placed within <Menu.Root>.',
    );
  }

  return context;
}

import { createContext } from 'actview';
import type { MenuRoot } from '../menu/root/MenuRoot';

export interface MenubarContext {
  modal: boolean;
  disabled: boolean;
  contentElement: HTMLElement | null;
  setContentElement: (element: HTMLElement | null) => void;
  hasSubmenuOpen: boolean;
  setHasSubmenuOpen: (open: boolean) => void;
  orientation: MenuRoot.Orientation;
  allowMouseUpTriggerRef: {value: boolean};
  rootId: string | undefined;
}

export const MenubarContext = createContext<MenubarContext | null>(null);

export function useMenubarContext(optional?: false): MenubarContext;
export function useMenubarContext(optional: true): MenubarContext | null;
export function useMenubarContext(optional?: boolean) {
  // store-as-is：use() 原样返回注入载体（无 Provider 时 null）。
  const context = MenubarContext.use();
  if (context === null && !optional) {
    throw new Error(
      'Base UI: MenubarContext is missing. Menubar parts must be placed within <Menubar>.',
    );
  }

  return context;
}

import type { ComputedRef } from '@actview/core';
import type { MenuRoot } from '@/menu/root/MenuRoot';
import { createContext } from '@/internals/createContext';

export interface MenubarContext {
  modal: boolean;
  disabled: boolean;
  contentElement: HTMLElement | null;
  setContentElement: (element: HTMLElement | null) => void;
  hasSubmenuOpen: boolean;
  setHasSubmenuOpen: (open: boolean) => void;
  orientation: MenuRoot.Orientation;
  allowMouseUpTriggerRef: { current: boolean };
  rootId: string | undefined;
}

export const MenubarContext = createContext<MenubarContext | null>('base-ui-menubar-context', null);

export function useMenubarContext(optional?: false): ComputedRef<MenubarContext>;
export function useMenubarContext(optional: true): ComputedRef<MenubarContext | null>;
export function useMenubarContext(optional = true): ComputedRef<MenubarContext | null> {
  const context = MenubarContext.use();
  if (context.value === null && !optional) {
    throw new Error(
      'Base UI: MenubarContext is missing. Menubar parts must be placed within <Menubar>.',
    );
  }

  return context as ComputedRef<MenubarContext | null>;
}

import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';

export type MenuGroupContext = (
  next: string | undefined | ((current: string | undefined) => string | undefined),
) => void;

export const MenuGroupContext = createContext<MenuGroupContext | undefined>(undefined);

export function useMenuGroupRootContext(): ComputedRef<MenuGroupContext> {
  const context = MenuGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.',
    );
  }

  return context as ComputedRef<MenuGroupContext>;
}
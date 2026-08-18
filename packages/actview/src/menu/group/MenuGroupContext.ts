import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export type MenuGroupContext = (
  next: string | undefined | ((current: string | undefined) => string | undefined),
) => void;

export const MenuGroupContext = createContext<MenuGroupContext | undefined>(
  'base-ui-menu-group-context',
  undefined,
);

export function useMenuGroupRootContext(): ComputedRef<MenuGroupContext> {
  const context = MenuGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.',
    );
  }

  return context as ComputedRef<MenuGroupContext>;
}

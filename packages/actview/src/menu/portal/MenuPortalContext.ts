import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export const MenuPortalContext = createContext<boolean | undefined>(
  'base-ui-menu-portal-context',
  undefined,
);

export function useMenuPortalContext() {
  const value = MenuPortalContext.use();
  if (value.value === undefined) {
    throw new Error('Base UI: <Menu.Portal> is missing.');
  }
  return value as ComputedRef<boolean>;
}

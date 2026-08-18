import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export const PopoverPortalContext = createContext<boolean | undefined>(
  'base-ui-popover-portal-context',
  undefined,
);

export function usePopoverPortalContext(): ComputedRef<boolean> {
  const value = PopoverPortalContext.use();
  if (value.value === undefined) {
    throw new Error('Base UI: <Popover.Portal> is missing.');
  }
  return value as ComputedRef<boolean>;
}

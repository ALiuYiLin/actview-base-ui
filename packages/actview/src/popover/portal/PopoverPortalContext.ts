import { createContext } from 'actview';

export const PopoverPortalContext = createContext<boolean | undefined>(undefined);

export function usePopoverPortalContext() {
  const context = PopoverPortalContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: <Popover.Portal> is missing.');
  }
  return context.value;
}

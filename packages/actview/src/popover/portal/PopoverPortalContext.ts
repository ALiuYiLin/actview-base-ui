import { createContext } from 'actview';

export const PopoverPortalContext = createContext<boolean>(false);

export function usePopoverPortalContext() {
  return PopoverPortalContext.use().value;
}

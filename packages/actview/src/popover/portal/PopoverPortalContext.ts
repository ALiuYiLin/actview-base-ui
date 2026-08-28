import { createContext } from 'actview';

export const PopoverPortalContext = createContext<boolean | undefined>(undefined);

export function usePopoverPortalContext(): boolean {
  // store-as-is：use() 原样返回注入值（keepMounted 布尔）。
  const context = PopoverPortalContext.use();
  if (context === undefined) {
    throw new Error('Base UI: <Popover.Portal> is missing.');
  }
  return context;
}

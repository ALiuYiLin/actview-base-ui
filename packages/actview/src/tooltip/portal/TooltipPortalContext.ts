import { createContext } from 'actview';

export const TooltipPortalContext = createContext<boolean | undefined>(undefined);

export function useTooltipPortalContext(): boolean {
  // store-as-is：use() 原样返回注入值（keepMounted 布尔）。
  const context = TooltipPortalContext.use();
  if (context === undefined) {
    throw new Error('Base UI: <Tooltip.Portal> is missing.');
  }
  return context;
}

import { createContext } from 'actview';

export const TooltipPortalContext = createContext<boolean | undefined>(undefined);

export function useTooltipPortalContext() {
  const context = TooltipPortalContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: <Tooltip.Portal> is missing.');
  }
  return context.value;
}

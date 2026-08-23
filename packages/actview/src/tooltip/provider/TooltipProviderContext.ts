import { createContext } from 'actview';

export const TooltipProviderContext = createContext<number | undefined>(undefined);

export function useTooltipProviderContext() {
  const context = TooltipProviderContext.use();
  return context.value;
}

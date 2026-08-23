import { createContext } from 'actview';
import type { TooltipStore } from '../store/TooltipStore';

export type TooltipRootContext<Payload = unknown> = TooltipStore<Payload>;

export const TooltipRootContext = createContext<TooltipRootContext<unknown> | undefined>(undefined);

export function useTooltipRootContext(optional = true): any {
  const context = TooltipRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: <Tooltip.Root> is missing. Tooltip parts must be placed within <Tooltip.Root>.',
    );
  }
  return context.value;
}

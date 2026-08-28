import { createContext } from 'actview';
import type { TooltipStore } from '../store/TooltipStore';

export type TooltipRootContext<Payload = unknown> = TooltipStore<Payload>;

export const TooltipRootContext = createContext<TooltipRootContext<unknown> | undefined>(undefined);

export function useTooltipRootContext(optional = true): any {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = TooltipRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: <Tooltip.Root> is missing. Tooltip parts must be placed within <Tooltip.Root>.',
    );
  }
  return context;
}

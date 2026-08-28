import { createContext } from 'actview';
import type { ComputedRef } from 'actview';

export const TooltipProviderContext = createContext<ComputedRef<number | undefined> | undefined>(
  undefined,
);

export function useTooltipProviderContext() {
  // store-as-is：Provider 注入 ComputedRef 载体（读 .value 求值）；无 Provider
  // 时返回 undefined（消费方自行取默认值）。
  const context = TooltipProviderContext.use();
  return context?.value;
}

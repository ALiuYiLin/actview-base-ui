import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { Side, Align } from '@/internals/useAnchorPositioning';

export const TooltipPositionerContext = createContext<TooltipPositionerContext | undefined>(
  undefined,
);

export interface TooltipPositionerContext {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowRef: Ref<Element | null>;
  arrowUncentered: boolean;
  arrowStyles: Record<string, string>;
}

export function useTooltipPositionerContext(optional = true) {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = TooltipPositionerContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Tooltip.Positioner> is missing.');
  }
  return context;
}

import { createContext } from 'actview';
import type { Side, Align } from '@/internals/useAnchorPositioning';

export const TooltipPositionerContext = createContext<TooltipPositionerContext | undefined>(
  undefined,
);

export interface TooltipPositionerContext {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowRef: {current: Element | null};
  arrowUncentered: boolean;
  arrowStyles: Record<string, string>;
}

export function useTooltipPositionerContext(optional = true) {
  const context = TooltipPositionerContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Tooltip.Positioner> is missing.');
  }
  return context.value;
}

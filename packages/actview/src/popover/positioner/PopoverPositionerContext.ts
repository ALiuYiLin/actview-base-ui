import { createContext } from 'actview';
import type { Side, Align } from '@/internals/useAnchorPositioning';

export const PopoverPositionerContext = createContext<PopoverPositionerContext | undefined>(
  undefined,
);

export interface PopoverPositionerContext {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowRef: {current: Element | null};
  arrowUncentered: boolean;
  arrowStyles: Record<string, string>;
}

export function usePopoverPositionerContext() {
  const context = PopoverPositionerContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: PopoverPositionerContext is missing. Popover parts must be placed within <Popover.Positioner>.',
    );
  }
  return context.value;
}

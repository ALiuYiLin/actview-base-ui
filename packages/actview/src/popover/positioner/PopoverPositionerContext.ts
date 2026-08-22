import type { ComputedRef } from '@actview/core';
import type { Align, Side } from '@/internals/useAnchorPositioning';
import type { StyleValue } from '@/internals/types';
import { createContext } from '@/internals/createContext';

export interface PopoverPositionerContext {
  side: Side;
  align: Align;
  arrowRef: { current: Element | null };
  arrowUncentered: boolean;
  arrowStyles: StyleValue;
}

export const PopoverPositionerContext = createContext<PopoverPositionerContext | undefined>(
  'base-ui-popover-positioner-context',
  undefined,
);

export function usePopoverPositionerContext(): ComputedRef<PopoverPositionerContext> {
  const context = PopoverPositionerContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: PopoverPositionerContext is missing. PopoverPositioner parts must be placed within <Popover.Positioner>.',
    );
  }

  return context as ComputedRef<PopoverPositionerContext>;
}

import { createContext } from 'actview';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { Ref } from 'actview';

export const PopoverPositionerContext = createContext<PopoverPositionerContext | undefined>(
  undefined,
);

export interface PopoverPositionerContext {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowRef: Ref<Element | null>;
  arrowUncentered: boolean;
  arrowStyles: Record<string, string>;
}

export function usePopoverPositionerContext() {
  // store-as-is：use() 原样返回注入的 getter 载体（无 Provider 时 undefined）。
  const context = PopoverPositionerContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: PopoverPositionerContext is missing. Popover parts must be placed within <Popover.Positioner>.',
    );
  }
  return context;
}

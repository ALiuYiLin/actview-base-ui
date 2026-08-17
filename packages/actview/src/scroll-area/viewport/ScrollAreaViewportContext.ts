import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export interface ScrollAreaViewportContext {
  computeThumbPosition: () => void;
}

export const ScrollAreaViewportContext = createContext<ScrollAreaViewportContext | undefined>(
  'base-ui-scroll-area-viewport-context',
  undefined,
);

export function useScrollAreaViewportContext(): ComputedRef<ScrollAreaViewportContext> {
  const context = ScrollAreaViewportContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ScrollAreaViewportContext missing. ScrollAreaViewport parts must be placed within <ScrollArea.Viewport>.',
    );
  }
  return context as ComputedRef<ScrollAreaViewportContext>;
}

import { createContext } from 'actview';
import type { Ref } from 'actview';

export interface ScrollAreaViewportContext {
  computeThumbPosition: () => void;
}

export const ScrollAreaViewportContext = createContext<ScrollAreaViewportContext | undefined>(
  undefined,
);

export function useScrollAreaViewportContext(): ScrollAreaViewportContext {
  const context = ScrollAreaViewportContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaViewportContext missing. ScrollAreaViewport parts must be placed within <ScrollArea.Viewport>.',
    );
  }
  return context;
}

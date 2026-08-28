import { createContext } from 'actview';
import type { Ref } from 'actview';

export type ScrollAreaScrollbarOrientation = 'vertical' | 'horizontal';

export const ScrollAreaScrollbarContext = createContext<
  ScrollAreaScrollbarOrientation | undefined
>(undefined);

export function useScrollAreaScrollbarContext(): ScrollAreaScrollbarOrientation {
  const context = ScrollAreaScrollbarContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaScrollbarContext missing. ScrollAreaThumb must be placed within <ScrollArea.Scrollbar>.',
    );
  }
  return context;
}

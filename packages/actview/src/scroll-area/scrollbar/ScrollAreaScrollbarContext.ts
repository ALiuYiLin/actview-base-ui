import { createContext } from 'actview';

export type ScrollAreaScrollbarOrientation = 'vertical' | 'horizontal';

export interface ScrollAreaScrollbarContextValue {
  readonly orientation: ScrollAreaScrollbarOrientation;
}

export const ScrollAreaScrollbarContext = createContext<
  ScrollAreaScrollbarContextValue | undefined
>(undefined);

export function useScrollAreaScrollbarContext(): ScrollAreaScrollbarContextValue {
  const context = ScrollAreaScrollbarContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaScrollbarContext missing. ScrollAreaThumb must be placed within <ScrollArea.Scrollbar>.',
    );
  }
  return context;
}

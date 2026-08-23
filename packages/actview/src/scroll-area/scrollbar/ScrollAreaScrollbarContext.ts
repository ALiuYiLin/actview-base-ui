import { createContext } from 'actview';
import type { Ref } from 'actview';

export type ScrollAreaScrollbarOrientation = 'vertical' | 'horizontal';

export const ScrollAreaScrollbarContext = createContext<
  ScrollAreaScrollbarOrientation | undefined
>(undefined);

export function useScrollAreaScrollbarContext(): Ref<ScrollAreaScrollbarOrientation> {
  const context = ScrollAreaScrollbarContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ScrollAreaScrollbarContext missing. ScrollAreaThumb must be placed within <ScrollArea.Scrollbar>.',
    );
  }
  return context as unknown as Ref<ScrollAreaScrollbarOrientation>;
}

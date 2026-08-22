import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

export type ScrollAreaScrollbarContext = 'horizontal' | 'vertical';

export const ScrollAreaScrollbarContext = createContext<
  ScrollAreaScrollbarContext | undefined
>('base-ui-scroll-area-scrollbar-context', undefined);

export function useScrollAreaScrollbarContext(): ComputedRef<ScrollAreaScrollbarContext> {
  const context = ScrollAreaScrollbarContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ScrollAreaScrollbarContext is missing. ScrollAreaScrollbar parts must be placed within <ScrollArea.Scrollbar>.',
    );
  }
  return context as ComputedRef<ScrollAreaScrollbarContext>;
}

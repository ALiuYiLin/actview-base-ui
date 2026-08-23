import { computed, createContext } from 'actview';
import type { ComputedRef, Ref } from 'actview';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContext = {
  direction: TextDirection;
};

export const DirectionContext = createContext<DirectionContext | undefined>(undefined);

export function useDirection(): ComputedRef<TextDirection> {
  const context = DirectionContext.use();
  return computed(() => context.value?.direction ?? 'ltr');
}

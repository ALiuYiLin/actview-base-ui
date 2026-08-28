import { computed, createContext } from 'actview';
import type { ComputedRef } from 'actview';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContext = {
  direction: TextDirection;
};

export const DirectionContext = createContext<DirectionContext | undefined>(undefined);

export function useDirection(): ComputedRef<TextDirection> {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined → 'ltr' 兜底）。
  const context = DirectionContext.use();
  return computed(() => context?.direction ?? 'ltr');
}

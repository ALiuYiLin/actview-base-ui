import { createContext, computed } from 'actview';
import type { ComputedRef } from 'actview';

export interface FieldItemContext {
  disabled: ComputedRef<boolean>;
}

export const FieldItemContext = createContext<FieldItemContext>({
  disabled: computed(() => false),
});

export function useFieldItemContext(): FieldItemContext {
  // store-as-is：原样返回载体。
  return FieldItemContext.use();
}

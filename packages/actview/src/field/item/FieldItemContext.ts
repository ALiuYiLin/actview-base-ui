import { createContext, computed } from 'actview';
import type { ComputedRef, Ref } from 'actview';

export interface FieldItemContext {
  disabled: ComputedRef<boolean>;
}

export const FieldItemContext = createContext<FieldItemContext>({
  disabled: computed(() => false),
});

export function useFieldItemContext(): Ref<FieldItemContext> {
  return FieldItemContext.use();
}

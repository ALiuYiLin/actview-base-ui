import { createContext } from 'actview';
import type { Ref } from 'actview';

export interface FieldItemContext {
  disabled: boolean;
}

export const FieldItemContext = createContext<FieldItemContext>({disabled: false});

export function useFieldItemContext(): Ref<FieldItemContext> {
  return FieldItemContext.use();
}

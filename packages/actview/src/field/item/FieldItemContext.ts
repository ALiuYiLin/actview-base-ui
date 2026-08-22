import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

export interface FieldItemContext {
  disabled: boolean;
}

export const FieldItemContext = createContext<FieldItemContext>('base-ui-field-item-context', {
  disabled: false,
});

export function useFieldItemContext(): ComputedRef<FieldItemContext> {
  return FieldItemContext.use();
}
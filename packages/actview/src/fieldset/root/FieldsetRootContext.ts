import { createContext } from 'actview';
import type { Ref } from 'actview';

export interface FieldsetRootContext {
  legendId: string | undefined;
  setLegendId: (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void;
  disabled: boolean;
}

export const FieldsetRootContext = createContext<FieldsetRootContext | undefined>(undefined);

export function useFieldsetRootContext(optional: true): Ref<FieldsetRootContext | undefined>;
export function useFieldsetRootContext(optional?: false): Ref<FieldsetRootContext>;
export function useFieldsetRootContext(optional = false) {
  const context = FieldsetRootContext.use();
  if (!context.value && !optional) {
    throw new Error(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  }
  return context;
}

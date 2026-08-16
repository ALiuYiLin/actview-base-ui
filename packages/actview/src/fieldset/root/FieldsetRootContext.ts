import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export interface FieldsetRootContext {
  legendId: string | undefined;
  setLegendId: (id: string | undefined) => void;
  disabled: boolean;
}

export const FieldsetRootContext = createContext<FieldsetRootContext | undefined>(
  'base-ui-fieldset-root-context',
  undefined,
);

export function useFieldsetRootContext(optional: true): ComputedRef<FieldsetRootContext | undefined>;
export function useFieldsetRootContext(optional?: false): ComputedRef<FieldsetRootContext>;
export function useFieldsetRootContext(optional = false) {
  const context = FieldsetRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  }
  return context;
}

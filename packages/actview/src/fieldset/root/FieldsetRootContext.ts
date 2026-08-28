import { createContext } from 'actview';

export interface FieldsetRootContext {
  legendId: string | undefined;
  setLegendId: (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void;
  disabled: boolean;
}

export const FieldsetRootContext = createContext<FieldsetRootContext | undefined>(undefined);

export function useFieldsetRootContext(optional: true): FieldsetRootContext | undefined;
export function useFieldsetRootContext(optional?: false): FieldsetRootContext;
export function useFieldsetRootContext(optional = false) {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined）。
  const context = FieldsetRootContext.use();
  if (!context && !optional) {
    throw new Error(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  }
  return context;
}

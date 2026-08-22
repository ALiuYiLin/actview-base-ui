import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';
import type { CheckboxRootState } from '@/checkbox/root/CheckboxRoot';

export type CheckboxRootContext = CheckboxRootState;

export const CheckboxRootContext = createContext<CheckboxRootContext | undefined>(
  'base-ui-checkbox-root-context',
  undefined,
);

export function useCheckboxRootContext(): ComputedRef<CheckboxRootState> {
  const context = CheckboxRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.',
    );
  }

  return context as ComputedRef<CheckboxRootState>;
}

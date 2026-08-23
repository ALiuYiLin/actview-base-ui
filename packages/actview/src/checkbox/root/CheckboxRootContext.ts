import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { CheckboxRootState } from './CheckboxRoot';

export type CheckboxRootContext = CheckboxRootState;

export const CheckboxRootContext = createContext<CheckboxRootContext | undefined>(undefined);

export function useCheckboxRootContext(): Ref<CheckboxRootContext | undefined> {
  const context = CheckboxRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.',
    );
  }

  return context;
}

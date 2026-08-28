import { createContext } from 'actview';
import type { CheckboxRootState } from './CheckboxRoot';

export type CheckboxRootContext = CheckboxRootState;

export const CheckboxRootContext = createContext<CheckboxRootContext | undefined>(undefined);

export function useCheckboxRootContext(): CheckboxRootContext {
  // store-as-is：原样返回注入的载体。
  const context = CheckboxRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.',
    );
  }

  return context;
}

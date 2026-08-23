import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { RadioRootState } from './RadioRoot';

export type RadioRootContext = RadioRootState;

export const RadioRootContext = createContext<RadioRootContext | undefined>(undefined);

export function useRadioRootContext(): Ref<RadioRootContext | undefined> {
  const value = RadioRootContext.use();
  if (value.value === undefined) {
    throw new Error(
      'Base UI: RadioRootContext is missing. Radio parts must be placed within <Radio.Root>.',
    );
  }

  return value;
}

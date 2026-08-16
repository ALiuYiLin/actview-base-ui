import type { ComputedRef } from '@actview/core';
import type { RadioRootState } from './RadioRoot';
import { createContext } from '../../internals/createContext';

export type RadioRootContext = RadioRootState;

export const RadioRootContext = createContext<RadioRootContext | undefined>(
  'base-ui-radio-root-context',
  undefined,
);

export function useRadioRootContext() {
  const value = RadioRootContext.use();
  if (value.value === undefined) {
    throw new Error(
      'Base UI: RadioRootContext is missing. Radio parts must be placed within <Radio.Root>.',
    );
  }

  return value as ComputedRef<RadioRootContext>;
}

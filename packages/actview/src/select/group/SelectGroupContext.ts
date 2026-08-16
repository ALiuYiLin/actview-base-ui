import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export interface SelectGroupContext {
  labelId: string | undefined;
  setLabelId: (id: string | undefined) => void;
}

export const SelectGroupContext = createContext<SelectGroupContext | undefined>(
  'base-ui-select-group-context',
  undefined,
);

export function useSelectGroupContext(): ComputedRef<SelectGroupContext> {
  const context = SelectGroupContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SelectGroupContext is missing. SelectGroup parts must be placed within <Select.Group>.',
    );
  }
  return context as ComputedRef<SelectGroupContext>;
}

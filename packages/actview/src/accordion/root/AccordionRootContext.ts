import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { AccordionRoot } from './AccordionRoot';

export interface AccordionRootContext<Value = any> {
  disabled: boolean;
  handleValueChange: (
    newValue: AccordionRoot.Value<Value>[number],
    nextOpen: boolean,
    eventDetails: AccordionRoot.ChangeEventDetails,
  ) => void;
  hiddenUntilFound: boolean;
  keepMounted: boolean;
  state: AccordionRoot.State<Value>;
  value: AccordionRoot.Value<Value>;
}

export const AccordionRootContext = createContext<AccordionRootContext<any> | undefined>(
  'base-ui-accordion-root-context',
  undefined,
);

export function useAccordionRootContext<Value = any>(): ComputedRef<AccordionRootContext<Value>> {
  const context = AccordionRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
    );
  }
  return context as ComputedRef<AccordionRootContext<Value>>;
}

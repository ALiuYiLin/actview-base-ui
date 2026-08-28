import { createContext } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { AccordionRoot } from './AccordionRoot';

export interface AccordionRootContext<Value = any> {
  disabled: ComputedRef<boolean>;
  handleValueChange: (
    newValue: AccordionRoot.Value<Value>[number],
    nextOpen: boolean,
    eventDetails: AccordionRoot.ChangeEventDetails,
  ) => void;
  hiddenUntilFound: ComputedRef<boolean>;
  keepMounted: ComputedRef<boolean>;
  state: ComputedRef<AccordionRoot.State<Value>>;
  value: ComputedRef<AccordionRoot.Value<Value>>;
}

export const AccordionRootContext = createContext<AccordionRootContext<any> | undefined>(undefined);

export function useAccordionRootContext<Value = any>(): AccordionRootContext<Value> {
  const context = AccordionRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
    );
  }
  return context;
}

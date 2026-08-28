import { createContext } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { AccordionItemState } from './AccordionItem';

export interface AccordionItemContext {
  defaultTriggerId: string | undefined;
  open: ComputedRef<boolean>;
  state: ComputedRef<AccordionItemState>;
  setTriggerId: (
    value:
      | string
      | null
      | undefined
      | ((current: string | null | undefined) => string | null | undefined),
  ) => void;
  triggerId: ComputedRef<string | undefined>;
}

export const AccordionItemContext = createContext<AccordionItemContext | undefined>(undefined);

export function useAccordionItemContext(): AccordionItemContext {
  const context = AccordionItemContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
    );
  }
  return context;
}

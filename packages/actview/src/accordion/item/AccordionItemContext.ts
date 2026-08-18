import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';
import type { AccordionItemState } from './AccordionItem';

export interface AccordionItemContext {
  defaultTriggerId?: string | undefined;
  open: boolean;
  state: AccordionItemState;
  setTriggerId: (action: SetTriggerIdAction) => void;
  triggerId?: string | undefined;
}

type SetTriggerIdAction =
  | string
  | null
  | undefined
  | ((current: string | null | undefined) => string | null | undefined);

export const AccordionItemContext = createContext<AccordionItemContext | undefined>(
  'base-ui-accordion-item-context',
  undefined,
);

export function useAccordionItemContext(): ComputedRef<AccordionItemContext> {
  const context = AccordionItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
    );
  }
  return context as ComputedRef<AccordionItemContext>;
}

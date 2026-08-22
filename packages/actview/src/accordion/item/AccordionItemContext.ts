import { computed, createContext, reactive } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { Orientation } from '@/internals/types';

/**
 * The state of an accordion item, exposed to its subparts.
 * Mirrors the React contract (`AccordionItemState extends AccordionRootState`):
 * the root state fields (`value` / `disabled` / `orientation`) plus the item
 * fields (`hidden` / `index` / `open`).
 */
export interface AccordionItemState {
  /**
   * The current value.
   */
  value: any[];
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The component orientation.
   */
  orientation: Orientation;
  /**
   * Whether the accordion item's panel is currently hidden.
   */
  hidden: boolean;
  /**
   * The item index.
   */
  index: number;
  /**
   * Whether the component is open.
   */
  open: boolean;
}

export type SetTriggerIdAction =
  | string
  | null
  | undefined
  | ((current: string | null | undefined) => string | null | undefined);

export interface AccordionItemContext {
  defaultTriggerId?: string | undefined;
  open: boolean;
  state: AccordionItemState;
  setTriggerId: (action: SetTriggerIdAction) => void;
  triggerId?: string | undefined;
}
/**
 * Framework `createContext` (official, single-arg defaultValue).
 * The header reads the context only during render, so the official
 * Provider (watch-synced) is fine here (MIGRATION.md case 16.2 rule).
 */
export const AccordionItemContext = createContext<AccordionItemContext | undefined>(undefined);

/**
 * Consumer hook. Returns a `ComputedRef` so call sites keep the `.value`
 * read shape (MIGRATION.md case 5). Throws when no `<Accordion.Item>`
 * provides the context.
 */
export function useAccordionItemContext(): Ref<AccordionItemContext> {
  const context = AccordionItemContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
    );
  }
  return context as Ref<AccordionItemContext>;
}

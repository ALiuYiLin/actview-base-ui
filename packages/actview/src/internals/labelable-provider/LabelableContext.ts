import { NOOP } from '../noop';
import type { HTMLProps } from '../types';
import { createContext } from '../createContext';

export interface LabelableContext {
  /**
   * The `id` of the labelable element.
   * When `null` the label omits `htmlFor`, either because the association is implicit or
   * because the control takes its name from `aria-labelledby`.
   */
  controlId: string | null | undefined;
  registerControlId: (source: symbol, id: string | null | undefined) => void;
  resetControlId: () => void;
  /**
   * The `id` of the label.
   */
  labelId: string | undefined;
  setLabelId: (id: string | undefined) => void;
  /**
   * An array of `id`s of elements that provide an accessible description.
   */
  messageIds: string[];
  setMessageIds: (ids: string[]) => void;
  getDescriptionProps: (externalProps: HTMLProps) => HTMLProps;
}

/**
 * A context for providing [labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label)\
 * with an accessible name (label) and description.
 */
export const LabelableContext = createContext<LabelableContext>('base-ui-labelable-context', {
  controlId: undefined,
  registerControlId: NOOP,
  resetControlId: NOOP,
  labelId: undefined,
  setLabelId: NOOP,
  messageIds: [],
  setMessageIds: NOOP,
  getDescriptionProps: (externalProps: HTMLProps) => externalProps,
});

export function useLabelableContext() {
  return LabelableContext.use();
}

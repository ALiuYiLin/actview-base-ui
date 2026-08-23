import { computed, createContext } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import { NOOP } from '@/internals/noop';
import type { HTMLProps } from '@/internals/types';

export interface LabelableContext {
  /**
   * The `id` of the labelable element.
   * When `null` the label omits `htmlFor`, either because the association is implicit or
   * because the control takes its name from `aria-labelledby`.
   */
  controlId: ComputedRef<string | null | undefined>;
  registerControlId: (source: symbol, id: string | null | undefined) => void;
  resetControlId: () => void;
  /**
   * The `id` of the label.
   */
  labelId: ComputedRef<string | undefined>;
  setLabelId: (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void;
  /**
   * An array of `id`s of elements that provide an accessible description.
   */
  messageIds: ComputedRef<string[]>;
  setMessageIds: (v: string[] | ((prev: string[]) => string[])) => void;
  getDescriptionProps: (externalProps: HTMLProps) => HTMLProps;
}

/**
 * A context for providing [labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label)\
 * with an accessible name (label) and description.
 */
export const LabelableContext = createContext<LabelableContext>({
  controlId: computed(() => undefined),
  registerControlId: NOOP,
  resetControlId: NOOP,
  labelId: computed(() => undefined),
  setLabelId: NOOP,
  messageIds: computed(() => []),
  setMessageIds: NOOP,
  getDescriptionProps: (externalProps: HTMLProps) => externalProps,
});

export function useLabelableContext(): Ref<LabelableContext> {
  return LabelableContext.use();
}

import type { RefObject } from '@/internals/types';
import { createContext } from '@/internals/createContext';
import type { ComputedRef } from '@actview/core';

export interface NumberFieldScrubAreaContext {
  isScrubbing: boolean;
  isTouchInput: boolean;
  isPointerLockDenied: boolean;
  scrubAreaCursorRef: RefObject<HTMLSpanElement | null>;
}

export const NumberFieldScrubAreaContext = createContext<
  NumberFieldScrubAreaContext | undefined
>('base-ui-number-field-scrub-area-context', undefined);

export function useNumberFieldScrubAreaContext(): ComputedRef<NumberFieldScrubAreaContext> {
  const context = NumberFieldScrubAreaContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: NumberFieldScrubAreaContext is missing. NumberFieldScrubArea parts must be placed within <NumberField.ScrubArea>.',
    );
  }
  return context as ComputedRef<NumberFieldScrubAreaContext>;
}

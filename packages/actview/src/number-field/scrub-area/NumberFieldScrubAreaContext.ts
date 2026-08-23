import { createContext } from 'actview';
import type { Ref } from 'actview';

export interface NumberFieldScrubAreaContext {
  isScrubbing: boolean;
  isTouchInput: boolean;
  isPointerLockDenied: boolean;
  scrubAreaCursorRef: {current: HTMLSpanElement | null};
}

export const NumberFieldScrubAreaContext = createContext<
  NumberFieldScrubAreaContext | undefined
>(undefined);

export function useNumberFieldScrubAreaContext(): Ref<NumberFieldScrubAreaContext> {
  const context = NumberFieldScrubAreaContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: NumberFieldScrubAreaContext missing. NumberFieldScrubAreaCursor must be placed within <NumberField.ScrubArea>.',
    );
  }
  return context as unknown as Ref<NumberFieldScrubAreaContext>;
}

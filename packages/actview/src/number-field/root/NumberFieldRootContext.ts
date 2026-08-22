import type { RefObject } from '@/internals/types';
import type { NumberFieldRoot, NumberFieldRootState } from '@/number-field/root/NumberFieldRoot';
import type { EventWithOptionalKeyState, IncrementValueParameters } from '@/number-field/utils/types';
import { createContext } from '@/internals/createContext';
import type { ComputedRef } from '@actview/core';

export type InputMode = 'numeric' | 'decimal' | 'text';

export interface NumberFieldRootContext {
  minWithDefault: number;
  maxWithDefault: number;
  id: string | undefined;
  setValue: (value: number | null, details: NumberFieldRoot.ChangeEventDetails) => boolean;
  getStepAmount: (event?: EventWithOptionalKeyState) => number;
  incrementValue: (amount: number, params: IncrementValueParameters) => boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  allowInputSyncRef: RefObject<boolean>;
  formatOptionsRef: RefObject<Intl.NumberFormatOptions | undefined>;
  valueRef: RefObject<number | null>;
  lastChangedValueRef: RefObject<number | null>;
  hasPendingCommitRef: RefObject<boolean>;
  name: string | undefined;
  nameProp: string | undefined;
  inputMode: InputMode;
  getAllowedNonNumericKeys: () => Set<string>;
  min: number | undefined;
  max: number | undefined;
  setInputValue: (value: string) => void;
  locale: Intl.LocalesArgument;
  setIsScrubbing: (value: boolean) => void;
  state: NumberFieldRootState;
  onValueCommitted: (
    value: number | null,
    eventDetails: NumberFieldRoot.CommitEventDetails,
  ) => void;
}

export const NumberFieldRootContext = createContext<NumberFieldRootContext | undefined>(
  'base-ui-number-field-root-context',
  undefined,
);

export function useNumberFieldRootContext(): ComputedRef<NumberFieldRootContext> {
  const context = NumberFieldRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: NumberFieldRootContext is missing. NumberField parts must be placed within <NumberField.Root>.',
    );
  }

  return context as ComputedRef<NumberFieldRootContext>;
}

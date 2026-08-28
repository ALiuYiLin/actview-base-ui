import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { NumberFieldRoot, NumberFieldRootState } from './NumberFieldRoot';
import type { EventWithOptionalKeyState, IncrementValueParameters } from '../utils/types';

export type InputMode = 'numeric' | 'decimal' | 'text';

export interface NumberFieldRootContext {
  minWithDefault: number;
  maxWithDefault: number;
  id: string | undefined;
  setValue: (value: number | null, details: NumberFieldRoot.ChangeEventDetails) => boolean;
  getStepAmount: (event?: EventWithOptionalKeyState) => number;
  incrementValue: (amount: number, params: IncrementValueParameters) => boolean;
  inputRef: Ref<HTMLInputElement | null>;
  allowInputSyncRef: Ref<boolean | null>;
  formatOptionsRef: Ref<Intl.NumberFormatOptions | undefined>;
  valueRef: Ref<number | null>;
  lastChangedValueRef: Ref<number | null>;
  hasPendingCommitRef: Ref<boolean>;
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
  onValueCommitted: (value: number | null, eventDetails: NumberFieldRoot.CommitEventDetails) => void;
}

export const NumberFieldRootContext = createContext<NumberFieldRootContext | undefined>(undefined);

export function useNumberFieldRootContext(): NumberFieldRootContext {
  // store-as-is：use() 原样返回注入的 getter 载体。
  const context = NumberFieldRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: NumberFieldRootContext is missing. NumberField parts must be placed within <NumberField.Root>.',
    );
  }

  return context;
}

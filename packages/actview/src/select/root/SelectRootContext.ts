import type { ComputedRef } from '@actview/core';
import type { FloatingRootContext } from '@/floating-ui-actview';
import type { SelectStore } from '@/select/store';
import type { UseFieldValidationReturnValue } from '@/field/root/useFieldValidation';
import type { HTMLProps, RefObject } from '@/internals/types';
import { createContext } from '@/internals/createContext';
import type { SelectRoot } from '@/select/root/SelectRoot';

export interface SelectRootContext {
  store: SelectStore;
  floatingContext: FloatingRootContext;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  multiple: boolean;
  highlightItemOnHover: boolean;
  setValue: (nextValue: any, eventDetails: SelectRoot.ChangeEventDetails) => void;
  setOpen: (open: boolean, eventDetails: SelectRoot.ChangeEventDetails) => void;
  listRef: RefObject<Array<HTMLElement | null>>;
  popupRef: RefObject<HTMLDivElement | null>;
  scrollHandlerRef: RefObject<((el: HTMLDivElement) => void) | null>;
  handleScrollArrowVisibility: (scroller: HTMLElement) => void;
  scrollArrowsMountedCountRef: RefObject<number>;
  itemProps: HTMLProps;
  valueRef: RefObject<HTMLSpanElement | null>;
  valuesRef: RefObject<Array<any>>;
  labelsRef: RefObject<Array<string | null>>;
  typingRef: RefObject<boolean>;
  selectionRef: RefObject<{
    allowUnselectedMouseUp: boolean;
    allowSelectedMouseUp: boolean;
    dragY: number;
  }>;
  firstItemTextRef: RefObject<HTMLElement | null>;
  selectedItemTextRef: RefObject<HTMLElement | null>;
  validation: UseFieldValidationReturnValue;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  alignItemWithTriggerActiveRef: RefObject<boolean>;
  initialValueRef: RefObject<any>;
}

export const SelectRootContext = createContext<SelectRootContext | undefined>(
  'base-ui-select-root-context',
  undefined,
);

export function useSelectRootContext(): ComputedRef<SelectRootContext> {
  const context = SelectRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SelectRootContext is missing. Select parts must be placed within <Select.Root>.',
    );
  }
  return context as ComputedRef<SelectRootContext>;
}

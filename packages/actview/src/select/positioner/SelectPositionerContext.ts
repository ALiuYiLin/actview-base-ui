import type { ComputedRef } from '@actview/core';
import type { Side, UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';
import { createContext } from '../../internals/createContext';

export interface SelectPositionerContext extends Omit<UseAnchorPositioningReturnValue, 'side'> {
  side: ComputedRef<'none' | Side>;
  alignItemWithTriggerActive: boolean;
  setControlledAlignItemWithTrigger: (value: boolean) => void;
  scrollUpArrowRef: { current: HTMLDivElement | null };
  scrollDownArrowRef: { current: HTMLDivElement | null };
}

export const SelectPositionerContext = createContext<SelectPositionerContext | undefined>(
  'base-ui-select-positioner-context',
  undefined,
);

export function useSelectPositionerContext(): ComputedRef<SelectPositionerContext> {
  const context = SelectPositionerContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SelectPositionerContext is missing. SelectPositioner parts must be placed within <Select.Positioner>.',
    );
  }
  return context as ComputedRef<SelectPositionerContext>;
}

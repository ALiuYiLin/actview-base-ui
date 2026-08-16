import type { ComputedRef } from '@actview/core';
import { createContext } from '../../internals/createContext';

export type MeterRootContext = {
  formattedValue: string;
  /**
   * The value normalized to a `0`–`100` percentage of the range, clamped to those bounds.
   */
  percentageValue: number;
  setLabelId: (id: string | undefined) => void;
  value: number;
};

export const MeterRootContext = createContext<MeterRootContext | undefined>(
  'base-ui-meter-root-context',
  undefined,
);

export function useMeterRootContext() {
  const context = MeterRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
    );
  }

  return context as ComputedRef<MeterRootContext>;
}

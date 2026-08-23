import { createContext } from 'actview';
import type { Ref } from 'actview';

export type MeterRootContext = {
  /**
   * Formatted value of the component.
   */
  formattedValue: string;
  /**
   * The value normalized to a `0`–`100` percentage of the range, clamped to those bounds.
   */
  percentageValue: number;
  /**
   * Value of the component.
   */
  value: number;
  setLabelId: (value: string | undefined) => void;
};

/**
 * @internal
 */
export const MeterRootContext = createContext<MeterRootContext | undefined>(undefined);

export function useMeterRootContext(): Ref<MeterRootContext> {
  const context = MeterRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
    );
  }

  return context as unknown as Ref<MeterRootContext>;
}

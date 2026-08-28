import { createContext } from 'actview';

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

export function useMeterRootContext(): MeterRootContext {
  // store-as-is：原样返回注入的载体（无 Provider 时 undefined → 抛缺上下文错误）。
  const context = MeterRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
    );
  }

  return context;
}

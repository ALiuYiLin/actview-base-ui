import type { ComputedRef } from '@actview/core';
import { createContext } from 'actview';
import type { ProgressRootState } from './ProgressRoot';

export type ProgressRootContext = {
  /**
   * Formatted value of the component.
   */
  formattedValue: string;
  /**
   * The value normalized to a `0`–`100` percentage of the range, clamped to those bounds.
   * `null` while the progress is indeterminate.
   */
  percentageValue: number | null;
  /**
   * Value of the component.
   */
  value: number | null;
  setLabelId: (next: string | undefined | ((current: string | undefined) => string | undefined)) => void;
  state: ProgressRootState;
};

/**
 * @internal
 */
export const ProgressRootContext = createContext<ProgressRootContext | undefined>(undefined);

export function useProgressRootContext() {
  const context = ProgressRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ProgressRootContext is missing. Progress parts must be placed within <Progress.Root>.',
    );
  }

  return context as ComputedRef<ProgressRootContext>;
}
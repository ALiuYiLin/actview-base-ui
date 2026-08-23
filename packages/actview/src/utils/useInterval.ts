import { onUnmounted } from 'actview';
import { Timeout } from '@/utils/useTimeout';

type IntervalId = number;

const EMPTY = 0 as IntervalId;

export class Interval extends Timeout {
  /**
   * Executes `fn` at `delay` interval, clearing any previously scheduled call.
   */
  start(delay: number, fn: () => void) {
    this.clear();
    this.currentId = setInterval(() => {
      fn();
    }, delay) as unknown as number;
  }

  clear = () => {
    if (this.currentId !== EMPTY) {
      clearInterval(this.currentId as IntervalId);
      this.currentId = EMPTY;
    }
  };
}

/**
 * A `setInterval` with automatic cleanup and guard.
 */
export function useInterval() {
  const interval = new Interval();

  onUnmounted(interval.disposeEffect());

  return interval;
}

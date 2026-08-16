type Callback = (...args: any[]) => any;

/**
 * Stabilizes the function passed so it's always the same reference.
 *
 * ActView closures are inherently stable (the component setup runs once), so the function
 * is returned as-is. Values it captures must be refs (or read through getters) to stay fresh.
 */
export function useStableCallback<T extends Callback>(callback: T | undefined): T {
  return callback as T;
}

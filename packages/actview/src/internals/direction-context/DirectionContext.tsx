import { computed } from 'actview';
import { createContext } from '../createContext';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContext = {
  direction: TextDirection;
};

export const DirectionContext = createContext<DirectionContext | undefined>(
  'base-ui-direction-context',
  undefined,
);

/**
 * Returns a computed ref of the current text direction.
 * Read `.value` inside render functions.
 */
export function useDirection() {
  // `use()` must be called in setup (it uses `useInjects`), so resolve the context
  // once here and read `.value` inside the computed.
  const context = DirectionContext.use();
  return computed(() => context.value?.direction ?? 'ltr');
}

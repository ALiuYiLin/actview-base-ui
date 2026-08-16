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
  return computed(() => DirectionContext.use().value?.direction ?? 'ltr');
}

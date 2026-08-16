import { computed } from 'actview';
import { createContext } from '../createContext';

export interface CSPContextValue {
  nonce?: string | undefined;
  disableStyleElements?: boolean | undefined;
}

export const CSPContext = createContext<CSPContextValue | undefined>(
  'base-ui-csp-context',
  undefined,
);

const DEFAULT_CSP_CONTEXT_VALUE: CSPContextValue = {
  disableStyleElements: false,
};

/**
 * Returns a computed ref of the current CSP context.
 * Read `.value` inside render functions.
 */
export function useCSPContext() {
  const context = CSPContext.use();
  return computed(() => context.value ?? DEFAULT_CSP_CONTEXT_VALUE);
}

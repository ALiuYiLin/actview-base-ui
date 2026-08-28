import { createContext } from 'actview';
import type { Ref } from 'actview';
import type { UseCollapsibleRootReturnValue } from './useCollapsibleRoot';
import type { CollapsibleRootState } from './CollapsibleRoot';

export interface CollapsibleRootContext extends UseCollapsibleRootReturnValue {
  onOpenChange: (open: boolean, eventDetails: any) => void;
  state: CollapsibleRootState;
}

export const CollapsibleRootContext = createContext<CollapsibleRootContext | undefined>(undefined);

export function useCollapsibleRootContext(): CollapsibleRootContext {
  const context = CollapsibleRootContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: CollapsibleRootContext is missing. Collapsible parts must be placed within <Collapsible.Root>.',
    );
  }

  return context;
}

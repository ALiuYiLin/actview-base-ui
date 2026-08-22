import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';
import type { UseCollapsibleRootReturnValue } from '@/collapsible/root/useCollapsibleRoot';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import type { CollapsibleRoot, CollapsibleRootState } from '@/collapsible/root/CollapsibleRoot';

/**
 * The context value shared with `Collapsible.Trigger`/`Collapsible.Panel`.
 *
 * Unlike `UseCollapsibleRootReturnValue` (which exposes refs for internal composition), the
 * provider unwraps every reactive field into a plain snapshot wrapped in a `computed`, so
 * consumers read `context.value.open` etc. inside their render functions and stay reactive.
 */
export interface CollapsibleRootContext {
  defaultPanelId: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  handleTrigger: (event: MouseEvent | KeyboardEvent) => void;
  /**
   * Whether the collapsible panel is mounted for transition and hidden-state purposes.
   */
  mounted: boolean;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: boolean;
  panelId: string | undefined;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (nextOpen: boolean) => void;
  setPanelIdState: UseCollapsibleRootReturnValue['setPanelIdState'];
  transitionStatus: TransitionStatus;
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  state: CollapsibleRootState;
}

export const CollapsibleRootContext = createContext<CollapsibleRootContext | undefined>(
  'base-ui-collapsible-root-context',
  undefined,
);

export function useCollapsibleRootContext(): ComputedRef<CollapsibleRootContext> {
  const context = CollapsibleRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: CollapsibleRootContext is missing. Collapsible parts must be placed within <Collapsible.Root>.',
    );
  }

  return context as ComputedRef<CollapsibleRootContext>;
}

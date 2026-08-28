import { createContext } from 'actview';
import type { Ref } from 'actview';

export interface TabsListContext {
  activateOnFocus: boolean;
  registerIndicatorUpdateListener: (listener: () => void) => () => void;
  registerTabResizeObserverElement: (element: HTMLElement) => () => void;
  tabsListElement: HTMLElement | null;
}

/**
 * @internal
 */
export const TabsListContext = createContext<TabsListContext | undefined>(undefined);

export function useTabsListContext(): TabsListContext {
  const context = TabsListContext.use();
  if (context === undefined) {
    throw new Error(
      'Base UI: TabsListContext is missing. Tabs parts must be placed within <Tabs.List>.',
    );
  }

  return context;
}

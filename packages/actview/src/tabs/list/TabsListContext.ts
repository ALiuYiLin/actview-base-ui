import { createContext } from '../../internals/createContext';
import type { ComputedRef } from '@actview/core';

export interface TabsListContext {
  activateOnFocus: boolean;
  registerIndicatorUpdateListener: (listener: () => void) => () => void;
  registerTabResizeObserverElement: (element: HTMLElement) => () => void;
  tabsListElement: HTMLElement | null;
}

export const TabsListContext = createContext<TabsListContext | undefined>(
  'base-ui-tabs-list-context',
  undefined,
);

export function useTabsListContext() {
  const context = TabsListContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: TabsListContext is missing. TabsList parts must be placed within <Tabs.List>.',
    );
  }

  return context as ComputedRef<TabsListContext>;
}

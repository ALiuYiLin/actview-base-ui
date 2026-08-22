import type { ComputedRef } from '@actview/core';
import { createContext } from '@/internals/createContext';

interface GroupCollectionContextValue {
  items: readonly any[];
}

const GroupCollectionContext = createContext<GroupCollectionContextValue | null>(
  'base-ui-combobox-group-collection-context',
  null,
);

export function useGroupCollectionContext(): ComputedRef<GroupCollectionContextValue | null> {
  return GroupCollectionContext.use();
}

export function GroupCollectionProvider(props: GroupCollectionProvider.Props) {
  const { children, items } = props;

  return (
    <GroupCollectionContext.Provider value={{ items }}>{children}</GroupCollectionContext.Provider>
  );
}

namespace GroupCollectionProvider {
  export interface Props {
    children: any;
    items: readonly any[];
  }
}

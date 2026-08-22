import { computed } from 'actview';
import { useComboboxDerivedItemsContext } from '@/combobox/root/ComboboxRootContext';
import { useGroupCollectionContext } from '@/combobox/collection/GroupCollectionContext';

/**
 * Renders filtered list items.
 * Doesn't render its own HTML element.
 *
 * If rendering a flat list, pass a function child to the `List` component instead, which implicitly wraps it.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxCollection(props: ComboboxCollection.Props) {
  const { children } = props;

  const derivedItems = useComboboxDerivedItemsContext();
  const groupContext = useGroupCollectionContext();

  // Setup runs once in ActView; evaluate the derived items reactively so the collection
  // re-renders as the filter changes.
  const itemsToRender = computed(() =>
    groupContext.value ? groupContext.value.items : derivedItems.value.filteredItems,
  );

  return <>{itemsToRender.value.map(children as any)}</>;
}

export interface ComboboxCollectionState {}

export interface ComboboxCollectionProps {
  children: (item: any, index: number) => any;
}

export namespace ComboboxCollection {
  export type State = ComboboxCollectionState;
  export type Props = ComboboxCollectionProps;
}

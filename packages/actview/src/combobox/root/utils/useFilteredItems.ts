import { useComboboxDerivedItemsContext } from '@/combobox/root/ComboboxRootContext';

/**
 * Returns the internally filtered items.
 */
export function useFilteredItems<T>() {
  const items = useComboboxDerivedItemsContext();
  return items.value.filteredItems as T[];
}

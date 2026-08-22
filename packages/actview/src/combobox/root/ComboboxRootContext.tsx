import { computed } from 'actview';
import type { ComputedRef } from '@actview/core';
import type { ComboboxStore } from '@/combobox/store';
import type { FloatingRootContext } from '@/floating-ui-actview';
import { createContext } from '@/internals/createContext';

export interface ComboboxDerivedItemsContext {
  query: string;
  hasItems: boolean;
  filteredItems: any[];
  /**
   * `filteredItems` flattened across groups and projected to selection values. Identical to the
   * items themselves unless `items` is a `createItems()` collection.
   */
  flatFilteredValues: any[];
}

export const ComboboxRootContext = createContext<ComboboxStore | undefined>(
  'base-ui-combobox-root-context',
  undefined,
);
export const ComboboxFloatingContext = createContext<FloatingRootContext | undefined>(
  'base-ui-combobox-floating-context',
  undefined,
);
export const ComboboxDerivedItemsContext = createContext<
  ComboboxDerivedItemsContext | undefined
>('base-ui-combobox-derived-items-context', undefined);
export const ComboboxHasItemsContext = createContext<boolean>(
  'base-ui-combobox-has-items-context',
  false,
);
// `inputValue` can't be placed in the store.
// https://github.com/mui/base-ui/issues/2703
export const ComboboxInputValueContext = createContext<any>('base-ui-combobox-input-value-context', '');

export function useComboboxRootContext(): ComboboxStore {
  const context = ComboboxRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ComboboxRootContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context.value as ComboboxStore;
}

export function useComboboxFloatingContext(): FloatingRootContext {
  const context = ComboboxFloatingContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ComboboxFloatingContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context.value as FloatingRootContext;
}

export function useComboboxDerivedItemsContext(): ComputedRef<ComboboxDerivedItemsContext> {
  const context = ComboboxDerivedItemsContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: ComboboxItemsContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context as ComputedRef<ComboboxDerivedItemsContext>;
}

export function useComboboxInputValueContext(): ComputedRef<any> {
  return ComboboxInputValueContext.use();
}

export function useComboboxHasItemsContext(): ComputedRef<boolean> {
  return ComboboxHasItemsContext.use();
}

import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';

export const MenuCheckboxItemDataAttributes = {
  checked: 'data-checked',
  unchecked: 'data-unchecked',
} as const;

export const itemMapping: StateAttributesMapping<{checked: boolean}> & {
  checkedKey: string;
  uncheckedKey: string;
} = {
  checked(value: boolean): Record<string, string> | null {
    if (value) {
      return {[MenuCheckboxItemDataAttributes.checked]: ''};
    }
    return {[MenuCheckboxItemDataAttributes.unchecked]: ''};
  },
  checkedKey: MenuCheckboxItemDataAttributes.checked,
  uncheckedKey: MenuCheckboxItemDataAttributes.unchecked,
};

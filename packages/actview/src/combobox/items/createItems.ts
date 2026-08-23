/**
 * Simplifies generating items for a combobox.
 *
 * actview 简化：react 版基于 collection/itemCollection 的完整实现
 * （flattenLeafItems/itemCollection 依赖）未迁移，这里提供等价的过滤逻辑：
 * - Record<string, ReactNode>：按键过滤
 * - 数组（含 {label, value} 对象）：按 label/value 字符串过滤
 * - 嵌套 group：仅过滤叶子
 */

export type ComboboxPrimitiveValue = string | number | bigint | boolean;

export interface ComboboxItemGroup<Item> {
  label: string;
  items: Item[];
}

export interface CreateComboboxItemsOptions<Item> {
  items: Item;
  inputValue?: string | undefined;
  labelKey?: string | undefined;
}

function stringify(value: any): string {
  return value == null ? '' : String(value);
}

function matches(value: any, inputValue: string, labelKey?: string) {
  const target =
    typeof value === 'object' && value !== null && labelKey
      ? value[labelKey]
      : typeof value === 'object' && value !== null && 'label' in value
        ? (value as any).label
        : value;
  return stringify(target).toLowerCase().includes(inputValue.trim().toLowerCase());
}

export function createComboboxItems<Item, Value extends ComboboxPrimitiveValue>(
  options: CreateComboboxItemsOptions<Item>,
) {
  const {items, inputValue = '', labelKey} = options;
  const query = inputValue.trim().toLowerCase();

  if (items == null) {
    return [];
  }

  // Record<string, ReactNode>
  if (!Array.isArray(items) && typeof items === 'object') {
    return Object.keys(items)
      .filter((key) => key.toLowerCase().includes(query))
      .map((key) => ({label: (items as any)[key], value: key}));
  }

  if (!Array.isArray(items)) {
    return [];
  }

  const result: any[] = [];

  for (const item of items as any[]) {
    // Group（含 items 数组）
    if (
      typeof item === 'object' &&
      item !== null &&
      Array.isArray((item as any).items)
    ) {
      const group: any = {...item, items: []};
      for (const leaf of (item as any).items as any[]) {
        if (!query || matches(leaf, inputValue, labelKey)) {
          group.items.push(leaf);
        }
      }
      if (group.items.length > 0) {
        result.push(group);
      }
      continue;
    }
    if (!query || matches(item, inputValue, labelKey)) {
      result.push(item);
    }
  }

  return result;
}

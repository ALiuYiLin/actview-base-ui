import { computed } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../internals/resolveValueLabel';

/**
 * The current value of the combobox.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxValue(props: ComboboxValue.Props) {
  const { children: childrenProp, placeholder } = props;

  const store = useComboboxRootContext();

  const itemToStringLabel = store.useState('itemToStringLabel');
  const selectedValue = store.useState('selectedValue');
  const items = store.useState('items');
  const multiple = computed(() => store.state.selectionMode === 'multiple');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const shouldCheckNullItemLabel =
    !hasSelectedValue.value && placeholder != null && childrenProp == null;
  const hasNullLabel = computed(() =>
    store.select('hasNullItemLabel', shouldCheckNullItemLabel),
  );

  const children = computed(() => {
    if (typeof childrenProp === 'function') {
      return childrenProp(selectedValue.value);
    } else if (childrenProp != null) {
      return childrenProp;
    } else if (!hasSelectedValue.value && placeholder != null && !hasNullLabel.value) {
      return placeholder;
    } else if (multiple.value && Array.isArray(selectedValue.value)) {
      return resolveMultipleLabels(
        selectedValue.value,
        items.value,
        itemToStringLabel.value,
      );
    } else {
      return resolveSelectedLabel(selectedValue.value, items.value, itemToStringLabel.value);
    }
  });

  return <>{children.value}</>;
}

export interface ComboboxValueState {}

export interface ComboboxValueProps {
  children?: any;
  /**
   * The placeholder value to display when no value is selected.
   * This is overridden by `children` if specified, or by a null item's label in `items`.
   */
  placeholder?: any;
}

export namespace ComboboxValue {
  export type State = ComboboxValueState;
  export type Props = ComboboxValueProps;
}

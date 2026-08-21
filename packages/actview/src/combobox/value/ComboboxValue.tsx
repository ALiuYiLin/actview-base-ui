import { computed, defineComponent } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../internals/resolveValueLabel';

/**
 * The current value of the combobox.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxValue = defineComponent(function (props: ComboboxValue.Props) {
  // ================= setup（只执行一次） =================
  const store = useComboboxRootContext();

  const itemToStringLabel = store.useState('itemToStringLabel');
  const selectedValue = store.useState('selectedValue');
  const items = store.useState('items');
  const multiple = computed(() => store.state.selectionMode === 'multiple');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const shouldCheckNullItemLabel =
    !hasSelectedValue.value && props.placeholder != null && props.children == null;
  const hasNullLabel = computed(() =>
    store.select('hasNullItemLabel', shouldCheckNullItemLabel),
  );

  const children = computed(() => {
    if (typeof props.children === 'function') {
      return props.children(selectedValue.value);
    } else if (props.children != null) {
      return props.children;
    } else if (!hasSelectedValue.value && props.placeholder != null && !hasNullLabel.value) {
      return props.placeholder;
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

  // ================= render（每次更新执行） =================
  return () => <>{children.value}</>;
}) as (props: ComboboxValue.Props) => any;

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
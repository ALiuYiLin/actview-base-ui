import { computed } from 'actview';
import { useComboboxInputValueContext } from '../../combobox/root/ComboboxRootContext';

/**
 * The current value of the autocomplete.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Autocomplete](https://base-ui.com/react/components/autocomplete)
 */
export function AutocompleteValue(props: AutocompleteValue.Props) {
  const { children } = props;

  // `use()` must run in setup; the computed below reads the live context value so it
  // stays reactive across renders.
  const inputValue = useComboboxInputValueContext();

  const rendered = computed(() => {
    if (typeof children === 'function') {
      return children(String(inputValue.value));
    } else if (children != null) {
      return children;
    }
    return inputValue.value;
  });

  return <>{rendered.value}</>;
}

export interface AutocompleteValueState {}

export interface AutocompleteValueProps {
  children?: any;
}

export namespace AutocompleteValue {
  export type State = AutocompleteValueState;
  export type Props = AutocompleteValueProps;
}

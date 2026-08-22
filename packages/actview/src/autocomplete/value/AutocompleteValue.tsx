import { defineComponent } from 'actview';
import { useComboboxInputValueContext } from '@/combobox/root/ComboboxRootContext';

/**
 * The current value of the autocomplete.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Autocomplete](https://base-ui.com/react/components/autocomplete)
 */
export const AutocompleteValue = defineComponent(function (props: AutocompleteValue.Props) {
  const inputValue = useComboboxInputValueContext();

  return () => {
    const { children } = props;
    const rendered = typeof children === 'function'
      ? children(String(inputValue.value))
      : children ?? inputValue.value;
    return <>{rendered}</>;
  };
}) as (props: AutocompleteValue.Props) => any;

export interface AutocompleteValueState {}

export interface AutocompleteValueProps {
  children?: any;
}

export namespace AutocompleteValue {
  export type State = AutocompleteValueState;
  export type Props = AutocompleteValueProps;
}
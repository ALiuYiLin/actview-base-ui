import { defineComponent, toValue } from 'actview';
import { useAutocompleteRootContext } from '../root/AutocompleteRootContext';

/** The value of the autocomplete. Renders a `<span>` element. */
export const AutocompleteValue = defineComponent(function AutocompleteValue(
  componentProps: AutocompleteValue.Props,
) {
  const context = useAutocompleteRootContext(false);
  const children = toValue(componentProps.children);

  return () => {
    const {render, className, style, placeholder, ...elementProps} = componentProps as any;
    const selectedValue = context.store.state.selectedValue;
    const hasValue = selectedValue != null && String(selectedValue) !== '';

    let display: any = children;
    if (typeof children === 'function') {
      display = children({value: selectedValue});
    } else if (display == null && hasValue) {
      display = String(selectedValue);
    } else if (display == null && !hasValue) {
      display = placeholder ?? '';
    }

    const merged: any = {
      ...elementProps,
      'data-placeholder': !hasValue ? '' : undefined,
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, children: display} as any);
      }
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged}>{display}</Tag>;
    }
    return <span {...merged}>{display}</span>;
  };
});

export interface AutocompleteValueProps {
  /**
   * The placeholder to display when no value is selected.
   */
  placeholder?: any;
  children?: any;
  [key: string]: any;
}

export namespace AutocompleteValue {
  export type Props = AutocompleteValueProps;
}

import { defineComponent, toValue, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';

/** The value of the select. Renders a `<span>` element. */
export const SelectValue = defineComponent(function SelectValue(
  componentProps: SelectValue.Props,
) {
  const store = useSelectRootContext(false);
  const children = toValue(componentProps.children);
  const value = computed(() => store.useState('value').value);

  return () => {
    const {render, className, style, placeholder, ...elementProps} = componentProps as any;
    const selectedValue = value.value;
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

export interface SelectValueProps {
  /**
   * The placeholder to display when no value is selected.
   */
  placeholder?: any;
  children?: any;
  [key: string]: any;
}

export namespace SelectValue {
  export type Props = SelectValueProps;
}

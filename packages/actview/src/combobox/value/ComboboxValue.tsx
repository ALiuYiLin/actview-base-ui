import { defineComponent, toValue } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** The value of the combobox. Renders a `<span>` element. */
export const ComboboxValue = defineComponent(function ComboboxValue(
  componentProps: ComboboxValue.Props,
) {
  const context = useComboboxRootContext(false);
  const children = toValue(componentProps.children);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const value = context.store.useState('selectedValue');

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

export interface ComboboxValueProps {
  /**
   * The placeholder to display when no value is selected.
   */
  placeholder?: any;
  children?: any;
  [key: string]: any;
}

export namespace ComboboxValue {
  export type Props = ComboboxValueProps;
}

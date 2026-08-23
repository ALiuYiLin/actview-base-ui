import { defineComponent, toValue } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** An individual combobox item. Renders a `<div>` element with role option. */
export const ComboboxItem = defineComponent(function ComboboxItem(
  componentProps: ComboboxItem.Props,
) {
  const context = useComboboxRootContext(false);
  const children = toValue(componentProps.children);
  const {value} = componentProps as any;

  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const selected = context.store.useState('isSelected', value as any);

  return () => {
    const {render, className, style, disabled = false, ...elementProps} = componentProps as any;

    const merged: any = {
      role: 'option',
      'aria-selected': selected.value,
      'data-selected': selected.value ? '' : undefined,
      ...elementProps,
      onClick: (event: any) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        context.store.selectItem(value);
      },
    };

    const ref = (el: any) => {
      if (componentProps.ref) {
        if (typeof componentProps.ref === 'function') (componentProps.ref as any)(el);
        else {
          (componentProps.ref as any).value = el;
          (componentProps.ref as any).current = el;
        }
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref} as any);
      }
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <div {...merged} ref={ref}>{children}</div>;
  };
});

export interface ComboboxItemProps {
  /**
   * The value of the item.
   */
  value: any;
  /**
   * Whether the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace ComboboxItem {
  export type Props = ComboboxItemProps;
}

import { defineComponent, toValue, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { SelectItemContext } from './SelectItemContext';

/** An individual select item. Renders a `<div>` element with role option. */
export const SelectItem = defineComponent(function SelectItem(componentProps: SelectItem.Props) {
  const store = useSelectRootContext(false);
  const children = toValue(componentProps.children);
  const {value} = componentProps as any;

  const selected = computed(() =>
    store.useState('isSelected', value as any).value ?? false,
  );

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
        store.selectValue(value);
      },
    };

    const contextValue = {
      selected: selected.value,
      value,
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

    const element = (() => {
      if (render) {
        if (typeof render === 'function') {
          return render({...merged, ref} as any);
        }
        const Tag = render.type as any;
        return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
      }
      return <div {...merged} ref={ref}>{children}</div>;
    })();

    return <SelectItemContext.Provider value={contextValue as any}>{element}</SelectItemContext.Provider>;
  };
});

export interface SelectItemProps {
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

export namespace SelectItem {
  export type Props = SelectItemProps;
}

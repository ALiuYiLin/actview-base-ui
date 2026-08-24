import { defineComponent, toValue } from 'actview';
import { useAutocompleteRootContext } from '../root/AutocompleteRootContext';

/** An individual autocomplete item. Renders a `<div>` element with role option. */
export const AutocompleteItem = defineComponent(function AutocompleteItem(
  componentProps: AutocompleteItem.Props,
) {
  const context = useAutocompleteRootContext(false);
  const children = toValue(componentProps.children);
  const {value} = componentProps as any;

  return () => {
    const {render, className, style, disabled = false, highlighted = false, ...elementProps} =
      componentProps as any;

    const merged: any = {
      role: 'option',
      'data-highlighted': highlighted ? '' : undefined,
      ...elementProps,
      onClick: (event: any) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        context.store.selectItem(value);
        context.setInputValue('');
      },
    };

    const ref = (el: any) => {
      if (componentProps.ref) {
        if (typeof componentProps.ref === 'function') (componentProps.ref as any)(el);
        else {
          (componentProps.ref as any).value = el;
          
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

export interface AutocompleteItemProps {
  /**
   * A unique value that identifies this item.
   */
  value: any;
  /**
   * Whether the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the item is highlighted.
   * @default false
   */
  highlighted?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace AutocompleteItem {
  export type Props = AutocompleteItemProps;
}

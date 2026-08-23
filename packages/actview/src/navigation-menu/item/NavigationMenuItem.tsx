import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** An individual navigation menu item. Renders a `<button>` element. */
export const NavigationMenuItem = defineComponent(function NavigationMenuItem(
  componentProps: NavigationMenuItem.Props,
) {
  const context = useNavigationMenuRootContext(false);
  const children = toValue(componentProps.children);

  return () => {
    const {render, className, style, value, ...elementProps} = componentProps as any;
    const merged: any = {
      type: 'button',
      ...elementProps,
      onClick: () => {
        if (!context.disabled && value != null) {
          context.setValue(value);
        }
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
      if (typeof render === 'function') return render({...merged, ref} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <button {...merged} ref={ref}>{children}</button>;
  };
});

export interface NavigationMenuItemProps {
  /**
   * The value of the item.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuItem {
  export type Props = NavigationMenuItemProps;
}

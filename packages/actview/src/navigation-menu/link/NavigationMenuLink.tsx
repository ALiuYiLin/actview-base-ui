import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** A link in the navigation menu. Renders an `<a>` element. */
export const NavigationMenuLink = defineComponent(function NavigationMenuLink(
  componentProps: NavigationMenuLink.Props,
) {
  const children = toValue(componentProps.children);
  const context = useNavigationMenuRootContext(true);

  return () => {
    const {render, className, style, value, ...elementProps} = componentProps as any;
    const merged: any = {
      ...elementProps,
      href: elementProps.href ?? '#',
      onClick: () => {
        if (value != null) {
          context?.setValue?.(value);
        }
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
      if (typeof render === 'function') return render({...merged, ref} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <a {...merged} ref={ref}>{children}</a>;
  };
});

export interface NavigationMenuLinkProps {
  /**
   * The value of the link.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuLink {
  export type Props = NavigationMenuLinkProps;
}

import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** A viewport for the popup content. Renders a `<div>` element. actview 简化：无布局计算。 */
export const NavigationMenuViewport = defineComponent(function NavigationMenuViewport(
  props: NavigationMenuViewport.Props,
) {
  const children = toValue(props.children);
  const context = useNavigationMenuRootContext(true);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
      context?.setViewportElement?.(el ?? null);
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          (props.ref as any).current = el;
        }
      }
    };
    if (render) {
      if (typeof render === 'function') return render({...merged, ref} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <div {...merged} ref={ref}>{children}</div>;
  };
});

export interface NavigationMenuViewportProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuViewport {
  export type Props = NavigationMenuViewportProps;
}

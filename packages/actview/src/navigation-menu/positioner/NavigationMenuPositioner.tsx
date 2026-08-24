import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** Positions the popup. Renders a `<div>` element. actview 简化：无定位计算。 */
export const NavigationMenuPositioner = defineComponent(function NavigationMenuPositioner(
  props: NavigationMenuPositioner.Props,
) {
  const context = useNavigationMenuRootContext(true);
  const children = toValue(props.children);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
      context?.setPositionerElement?.(el ?? null);
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          
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

export interface NavigationMenuPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuPositioner {
  export type Props = NavigationMenuPositionerProps;
}

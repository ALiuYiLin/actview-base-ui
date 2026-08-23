import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** Displays an arrow indicator. Renders a `<div>` element. */
export const NavigationMenuArrow = defineComponent(function NavigationMenuArrow(
  props: NavigationMenuArrow.Props,
) {
  const children = toValue(props.children);
  const context = useNavigationMenuRootContext(true);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {'aria-hidden': true, ...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children}</div>;
  };
});

export interface NavigationMenuArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuArrow {
  export type Props = NavigationMenuArrowProps;
}

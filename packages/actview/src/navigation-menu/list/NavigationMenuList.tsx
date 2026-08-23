import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** A list of navigation menu items. Renders a `<div>` element. */
export const NavigationMenuList = defineComponent(function NavigationMenuList(
  props: NavigationMenuList.Props,
) {
  const children = toValue(props.children);
  const context = useNavigationMenuRootContext(true);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children}</div>;
  };
});

export interface NavigationMenuListProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuList {
  export type Props = NavigationMenuListProps;
}

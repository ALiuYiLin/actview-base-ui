import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** Displays a chevron icon. Renders a `<span>` element. */
export const NavigationMenuIcon = defineComponent(function NavigationMenuIcon(
  props: NavigationMenuIcon.Props,
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
    return <span {...merged}>{children}</span>;
  };
});

export interface NavigationMenuIconProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuIcon {
  export type Props = NavigationMenuIconProps;
}

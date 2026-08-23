import { defineComponent, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** The content of the popup. Renders a `<div>` element. */
export const NavigationMenuContent = defineComponent(function NavigationMenuContent(
  props: NavigationMenuContent.Props,
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

export interface NavigationMenuContentProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuContent {
  export type Props = NavigationMenuContentProps;
}

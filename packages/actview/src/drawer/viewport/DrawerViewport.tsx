import { defineComponent, toValue } from 'actview';

/** A viewport for the drawer. Renders a `<div>` element. actview 简化：无虚拟键盘/缩进布局。 */
export const DrawerViewport = defineComponent(function DrawerViewport(
  props: DrawerViewport.Props,
) {
  const children = toValue(props.children);
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

export interface DrawerViewportProps {
  children?: any;
  [key: string]: any;
}

export namespace DrawerViewport {
  export type Props = DrawerViewportProps;
}

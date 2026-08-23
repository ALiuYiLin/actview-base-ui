import { defineComponent, toValue } from 'actview';

/** The content of the drawer. Renders a `<div>` element. */
export const DrawerContent = defineComponent(function DrawerContent(props: DrawerContent.Props) {
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

export interface DrawerContentProps {
  children?: any;
  [key: string]: any;
}

export namespace DrawerContent {
  export type Props = DrawerContentProps;
}

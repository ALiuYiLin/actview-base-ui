import { defineComponent, toValue } from 'actview';

/** Displays a chevron icon. Renders a `<span>` element. */
export const ComboboxIcon = defineComponent(function ComboboxIcon(props: ComboboxIcon.Props) {
  const children = toValue(props.children);
  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {'aria-hidden': true, ...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <span {...merged}>{children}</span>;
  };
});

export interface ComboboxIconProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxIcon {
  export type Props = ComboboxIconProps;
}

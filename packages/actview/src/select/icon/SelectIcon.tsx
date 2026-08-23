import { defineComponent, toValue } from 'actview';

/** Displays a chevron icon. Renders a `<span>` element. */
export const SelectIcon = defineComponent(function SelectIcon(props: SelectIcon.Props) {
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

export interface SelectIconProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectIcon {
  export type Props = SelectIconProps;
}

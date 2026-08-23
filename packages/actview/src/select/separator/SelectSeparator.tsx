import { defineComponent, toValue } from 'actview';

/** A separator between select items. Renders a `<div>` element. */
export const SelectSeparator = defineComponent(function SelectSeparator(
  props: SelectSeparator.Props,
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

export interface SelectSeparatorProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectSeparator {
  export type Props = SelectSeparatorProps;
}

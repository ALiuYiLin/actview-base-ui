import { defineComponent, toValue } from 'actview';

/** A row for the item value. Renders a `<div>` element. */
export const ComboboxRow = defineComponent(function ComboboxRow(props: ComboboxRow.Props) {
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

export interface ComboboxRowProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxRow {
  export type Props = ComboboxRowProps;
}

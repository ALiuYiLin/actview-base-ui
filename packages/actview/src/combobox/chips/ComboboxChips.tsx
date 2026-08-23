import { defineComponent, toValue } from 'actview';

/** A container for chips. Renders a `<div>` element. */
export const ComboboxChips = defineComponent(function ComboboxChips(props: ComboboxChips.Props) {
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

export interface ComboboxChipsProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxChips {
  export type Props = ComboboxChipsProps;
}

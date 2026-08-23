import { defineComponent, toValue } from 'actview';

/** Displays an arrow indicator. Renders a `<div>` element. */
export const ComboboxArrow = defineComponent(function ComboboxArrow(props: ComboboxArrow.Props) {
  const children = toValue(props.children);
  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {'aria-hidden': true, ...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children}</div>;
  };
});

export interface ComboboxArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxArrow {
  export type Props = ComboboxArrowProps;
}

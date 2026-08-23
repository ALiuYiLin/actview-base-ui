import { defineComponent, toValue } from 'actview';

/** A scroll-down arrow indicator. Renders a `<div>` element. actview 简化：静态渲染。 */
export const SelectScrollDownArrow = defineComponent(function SelectScrollDownArrow(
  props: SelectScrollDownArrow.Props,
) {
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

export interface SelectScrollDownArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectScrollDownArrow {
  export type Props = SelectScrollDownArrowProps;
}

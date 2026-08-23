import { defineComponent, toValue } from 'actview';

/** A scroll arrow for the select. Renders a `<div>` element. actview 简化：静态渲染。 */
export const SelectScrollArrow = defineComponent(function SelectScrollArrow(
  props: SelectScrollArrow.Props,
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

export interface SelectScrollArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectScrollArrow {
  export type Props = SelectScrollArrowProps;
}

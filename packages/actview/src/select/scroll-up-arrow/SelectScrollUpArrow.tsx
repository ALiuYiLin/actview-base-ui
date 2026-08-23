import { defineComponent, toValue } from 'actview';

/** A scroll-up arrow indicator. Renders a `<div>` element. actview 简化：静态渲染。 */
export const SelectScrollUpArrow = defineComponent(function SelectScrollUpArrow(
  props: SelectScrollUpArrow.Props,
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

export interface SelectScrollUpArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectScrollUpArrow {
  export type Props = SelectScrollUpArrowProps;
}

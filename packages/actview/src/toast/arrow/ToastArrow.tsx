import { defineComponent, toValue } from 'actview';

/** Displays an element positioned against the toast. Renders a `<div>` element. */
export const ToastArrow = defineComponent(function ToastArrow(props: ToastArrow.Props) {
  const children = toValue(props.children);
  return () => {
    const {render, ...elementProps} = props as any;
    const merged: any = {'aria-hidden': true, ...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged});
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children}</div>;
  };
});

export interface ToastArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastArrow {
  export type Props = ToastArrowProps;
}

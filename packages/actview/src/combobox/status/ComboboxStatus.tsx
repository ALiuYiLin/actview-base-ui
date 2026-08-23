import { defineComponent, toValue } from 'actview';

/** A status for screen readers. Renders a `<div>` element. actview 简化：静态渲染。 */
export const ComboboxStatus = defineComponent(function ComboboxStatus(props: ComboboxStatus.Props) {
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

export interface ComboboxStatusProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxStatus {
  export type Props = ComboboxStatusProps;
}

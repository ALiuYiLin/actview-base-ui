import { defineComponent, toValue } from 'actview';

/** Renders when there are no matching items. Renders a `<div>` element. actview 简化：静态渲染。 */
export const ComboboxEmpty = defineComponent(function ComboboxEmpty(props: ComboboxEmpty.Props) {
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

export interface ComboboxEmptyProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxEmpty {
  export type Props = ComboboxEmptyProps;
}

import { defineComponent, toValue } from 'actview';

/** Shows a checkmark when the item is selected. Renders a `<span>` element. */
export const ComboboxItemIndicator = defineComponent(function ComboboxItemIndicator(
  props: ComboboxItemIndicator.Props,
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
    return <span {...merged}>{children}</span>;
  };
});

export interface ComboboxItemIndicatorProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxItemIndicator {
  export type Props = ComboboxItemIndicatorProps;
}

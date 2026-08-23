import { defineComponent, toValue } from 'actview';

/** A separator between combobox items. Renders a `<div>` element. */
export const ComboboxSeparator = defineComponent(function ComboboxSeparator(
  props: ComboboxSeparator.Props,
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
    return <div {...merged}>{children}</div>;
  };
});

export interface ComboboxSeparatorProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxSeparator {
  export type Props = ComboboxSeparatorProps;
}

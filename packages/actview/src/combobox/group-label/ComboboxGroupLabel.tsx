import { defineComponent, toValue } from 'actview';

/** A label for a group of combobox items. Renders a `<div>` element. */
export const ComboboxGroupLabel = defineComponent(function ComboboxGroupLabel(
  props: ComboboxGroupLabel.Props,
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

export interface ComboboxGroupLabelProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxGroupLabel {
  export type Props = ComboboxGroupLabelProps;
}

import { defineComponent, toValue } from 'actview';

/** A label for the combobox. Renders a `<label>` element. */
export const ComboboxLabel = defineComponent(function ComboboxLabel(props: ComboboxLabel.Props) {
  const children = toValue(props.children);
  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <label {...merged}>{children}</label>;
  };
});

export interface ComboboxLabelProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxLabel {
  export type Props = ComboboxLabelProps;
}

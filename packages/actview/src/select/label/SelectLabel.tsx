import { defineComponent, toValue } from 'actview';

/** A label for the select. Renders a `<label>` element. */
export const SelectLabel = defineComponent(function SelectLabel(props: SelectLabel.Props) {
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

export interface SelectLabelProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectLabel {
  export type Props = SelectLabelProps;
}

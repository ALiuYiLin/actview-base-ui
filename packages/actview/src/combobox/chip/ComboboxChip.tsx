import { defineComponent, toValue } from 'actview';

/** An individual chip for a selected value. Renders a `<div>` element. */
export const ComboboxChip = defineComponent(function ComboboxChip(props: ComboboxChip.Props) {
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

export interface ComboboxChipProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxChip {
  export type Props = ComboboxChipProps;
}

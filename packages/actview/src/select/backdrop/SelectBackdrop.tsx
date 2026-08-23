import { defineComponent, toValue } from 'actview';

/** A backdrop for the popup. Renders a `<div>` element. */
export const SelectBackdrop = defineComponent(function SelectBackdrop(props: SelectBackdrop.Props) {
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

export interface SelectBackdropProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectBackdrop {
  export type Props = SelectBackdropProps;
}

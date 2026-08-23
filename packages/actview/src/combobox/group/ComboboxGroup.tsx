import { defineComponent, toValue } from 'actview';

/** Groups combobox items. Renders a `<div>` element. */
export const ComboboxGroup = defineComponent(function ComboboxGroup(props: ComboboxGroup.Props) {
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

export interface ComboboxGroupProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxGroup {
  export type Props = ComboboxGroupProps;
}

import { defineComponent, toValue } from 'actview';

/** Groups select items. Renders a `<div>` element. */
export const SelectGroup = defineComponent(function SelectGroup(props: SelectGroup.Props) {
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

export interface SelectGroupProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectGroup {
  export type Props = SelectGroupProps;
}

import { defineComponent, toValue } from 'actview';

/** A collection of combobox items. Renders a `<div>` element. */
export const ComboboxCollection = defineComponent(function ComboboxCollection(
  props: ComboboxCollection.Props,
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

export interface ComboboxCollectionProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxCollection {
  export type Props = ComboboxCollectionProps;
}

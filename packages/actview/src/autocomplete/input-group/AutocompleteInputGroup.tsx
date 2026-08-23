import { defineComponent, toValue } from 'actview';

/** Wraps the input. Renders a `<div>` element. */
export const AutocompleteInputGroup = defineComponent(function AutocompleteInputGroup(
  props: AutocompleteInputGroup.Props,
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

export interface AutocompleteInputGroupProps {
  children?: any;
  [key: string]: any;
}

export namespace AutocompleteInputGroup {
  export type Props = AutocompleteInputGroupProps;
}

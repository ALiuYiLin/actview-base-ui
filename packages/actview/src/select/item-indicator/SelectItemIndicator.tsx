import { defineComponent, toValue } from 'actview';
import { useSelectItemContext } from '../item/SelectItemContext';

/** Shows a checkmark when the item is selected. Renders a `<span>` element. */
export const SelectItemIndicator = defineComponent(function SelectItemIndicator(
  props: SelectItemIndicator.Props,
) {
  const context = useSelectItemContext(false);
  const children = toValue(props.children);

  return () => {
    if (!context.selected) {
      return null;
    }
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <span {...merged}>{children}</span>;
  };
});

export interface SelectItemIndicatorProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectItemIndicator {
  export type Props = SelectItemIndicatorProps;
}

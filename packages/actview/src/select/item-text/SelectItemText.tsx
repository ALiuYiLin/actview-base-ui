import { defineComponent, toValue } from 'actview';
import { useSelectItemContext } from '../item/SelectItemContext';

/** The text of the item. Renders a `<span>` element. */
export const SelectItemText = defineComponent(function SelectItemText(props: SelectItemText.Props) {
  const context = useSelectItemContext(true);
  const children = toValue(props.children);

  return () => {
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

export interface SelectItemTextProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectItemText {
  export type Props = SelectItemTextProps;
}

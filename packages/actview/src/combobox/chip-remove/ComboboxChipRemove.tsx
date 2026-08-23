import { defineComponent, toValue } from 'actview';

/** Removes a chip. Renders a `<button>` element. actview 简化：无回调（由用户 onClick 处理）。 */
export const ComboboxChipRemove = defineComponent(function ComboboxChipRemove(
  props: ComboboxChipRemove.Props,
) {
  const children = toValue(props.children);
  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {
      type: 'button',
      'aria-label': 'Remove',
      ...elementProps,
    };
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged}>{children}</Tag>;
    }
    return <button {...merged}>{children}</button>;
  };
});

export interface ComboboxChipRemoveProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxChipRemove {
  export type Props = ComboboxChipRemoveProps;
}

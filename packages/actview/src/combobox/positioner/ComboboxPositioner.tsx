import { defineComponent, toValue } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** Positions the popup. Renders a `<div>` element. actview 简化：无定位计算。 */
export const ComboboxPositioner = defineComponent(function ComboboxPositioner(
  props: ComboboxPositioner.Props,
) {
  const context = useComboboxRootContext(false);
  const children = toValue(props.children);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
      context.store.setPositionerElement(el ?? null);
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          (props.ref as any).current = el;
        }
      }
    };
    if (render) {
      if (typeof render === 'function') return render({...merged, ref} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <div {...merged} ref={ref}>{children}</div>;
  };
});

export interface ComboboxPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPositioner {
  export type Props = ComboboxPositionerProps;
}

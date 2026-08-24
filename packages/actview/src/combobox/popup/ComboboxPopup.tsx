import { defineComponent, toValue } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** The popup of the combobox. Renders a `<div>` element when open. */
export const ComboboxPopup = defineComponent(function ComboboxPopup(props: ComboboxPopup.Props) {
  const context = useComboboxRootContext(false);
  const children = toValue(props.children);
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');
  const mounted = context.store.useState('mounted');

  return () => {
    if (!open.value && !mounted.value) {
      return null;
    }
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          
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

export interface ComboboxPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPopup {
  export type Props = ComboboxPopupProps;
}

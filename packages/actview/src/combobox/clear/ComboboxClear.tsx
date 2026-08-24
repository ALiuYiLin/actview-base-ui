import { defineComponent, toValue } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** Clears the selected value. Renders a `<button>` element. */
export const ComboboxClear = defineComponent(function ComboboxClear(props: ComboboxClear.Props) {
  const context = useComboboxRootContext(false);
  const children = toValue(props.children);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {
      type: 'button',
      'aria-label': 'Clear',
      ...elementProps,
      onClick: () => {
        context.store.setSelectedValue(undefined);
        context.setInputValue('');
      },
    };
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
    return <button {...merged} ref={ref}>{children}</button>;
  };
});

export interface ComboboxClearProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxClear {
  export type Props = ComboboxClearProps;
}

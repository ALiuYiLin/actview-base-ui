import { defineComponent, toValue } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';

/** A container for the toast content. Renders a `<div>` element. */
export const ToastContent = defineComponent(function ToastContent(props: ToastContent.Props) {
  const children = toValue(props.children);
  const context = useToastRootContext(false);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          (props.ref as any).current = el;
        }
      }
    };
    if (render) {
      if (typeof render === 'function') return render({...merged, ref});
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <div {...merged} ref={ref}>{children}</div>;
  };
});

export interface ToastContentProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastContent {
  export type Props = ToastContentProps;
}

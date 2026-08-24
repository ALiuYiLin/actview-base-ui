import { defineComponent, toValue } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';

/** A button for the toast action. Renders a `<button>` element with the toast's actionProps. */
export const ToastAction = defineComponent(function ToastAction(props: ToastAction.Props) {
  const children = toValue(props.children);
  const context = useToastRootContext(false);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {
      type: 'button' as const,
      ...(context.toast.actionProps ?? {}),
      ...elementProps,
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
      if (typeof render === 'function') return render({...merged, ref});
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <button {...merged} ref={ref}>{children}</button>;
  };
});

export interface ToastActionProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastAction {
  export type Props = ToastActionProps;
}

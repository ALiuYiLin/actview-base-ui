import { defineComponent } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';

/** The description of the toast. Renders a `<div>` element. */
export const ToastDescription = defineComponent(function ToastDescription(
  props: ToastDescription.Props,
) {
  const context = useToastRootContext(false);

  return () => {
    const {render, className, style, children, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged, ...context.toast});
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children ?? context.toast.description}</div>;
  };
});

export interface ToastDescriptionProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastDescription {
  export type Props = ToastDescriptionProps;
}

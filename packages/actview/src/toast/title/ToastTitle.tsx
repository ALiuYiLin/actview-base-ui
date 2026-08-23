import { defineComponent } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';

/** The title of the toast. Renders a `<div>` element. */
export const ToastTitle = defineComponent(function ToastTitle(props: ToastTitle.Props) {
  const context = useToastRootContext(false);

  return () => {
    const {render, className, style, children, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged, ...context.toast});
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children ?? context.toast.title}</div>;
  };
});

export interface ToastTitleProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastTitle {
  export type Props = ToastTitleProps;
}

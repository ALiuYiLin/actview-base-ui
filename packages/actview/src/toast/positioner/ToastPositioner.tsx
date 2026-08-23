import { defineComponent, toValue } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';

/** Positions the toast. Renders a `<div>` element. actview 简化：无定位计算。 */
export const ToastPositioner = defineComponent(function ToastPositioner(
  props: ToastPositioner.Props,
) {
  const children = toValue(props.children);
  const context = useToastRootContext(true);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {
      ...(context?.toast?.positionerProps ?? {}),
      ...elementProps,
    };
    if (render) {
      if (typeof render === 'function') return render({...merged});
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children}</div>;
  };
});

export interface ToastPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastPositioner {
  export type Props = ToastPositionerProps;
}

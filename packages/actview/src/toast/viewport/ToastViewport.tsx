import { defineComponent, toValue } from 'actview';
import { useToastProviderContext } from '../provider/ToastProviderContext';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * actview 简化：children 为渲染函数 `(toast, index) => ReactNode`；
 * 布局元数据（offsetY/height）未迁移。
 */
export const ToastViewport = defineComponent(function ToastViewport(
  componentProps: ToastViewport.Props,
) {
  const store = useToastProviderContext(false);

  const toasts = store.useState('toasts');

  return () => {
    const {render, className, style, children, ...elementProps} = componentProps as any;

    const merged: any = {...elementProps};

    const mergedRefs = (el: HTMLDivElement | null) => {
      store.state.viewport = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        
      }
    };

    const toastNodes = toasts.value.map((toast: any, index: number) => {
      if (typeof children === 'function') {
        return children(toast, index);
      }
      if (render) {
        if (typeof render === 'function') {
          return render({toast, ...toast});
        }
        const Tag = render.type as any;
        return <Tag {...render.props} toast={toast} />;
      }
      return null;
    });

    if (render && typeof render !== 'function') {
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{toastNodes}</Tag>;
    }

    return <div {...merged} ref={mergedRefs}>{toastNodes}</div>;
  };
});

export interface ToastViewportState {}

export interface ToastViewportProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastViewport {
  export type State = ToastViewportState;
  export type Props = ToastViewportProps;
}

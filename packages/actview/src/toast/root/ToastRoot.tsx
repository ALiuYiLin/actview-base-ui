import { defineComponent, toValue } from 'actview';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { ToastRootContext } from './ToastRootContext';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * Renders a toast.
 * Renders a `<div>` element.
 *
 * actview 简化：children 为渲染函数 `(props) => ReactNode`，props 包含
 * toast 的全部字段与 `close`；自动关闭计时（timeout）未迁移。
 */
export const ToastRoot = defineComponent(function ToastRoot(componentProps: ToastRoot.Props) {
  const {toast: toastProp, children, ...elementProps} = componentProps as any;

  const store = useToastProviderContext(false);
  const toasts = store.useState('toasts');

  return () => {
    const toast = toasts.value.find((t: any) => t.id === (toastProp?.id ?? toastProp));
    if (!toast) {
      return null;
    }

    const contextValue = {
      toast,
      close: () => store.closeToast(toast.id),
    };

    const merged: any = {...elementProps};

    const mergedRefs = (el: HTMLElement | null) => {
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        (componentProps.ref as any).current = el;
      }
    };

    const content = typeof children === 'function' ? children({...toast, close: contextValue.close}) : children;

    return (
      <ToastRootContext.Provider value={contextValue}>
        <div {...merged} ref={mergedRefs}>
          {content}
        </div>
      </ToastRootContext.Provider>
    );
  };
});

export interface ToastRootState {}

export interface ToastRootProps extends BaseUIComponentProps<'div', ToastRootState> {
  /**
   * The toast object to render.
   */
  toast?: any;
  children?: any;
  [key: string]: any;
}

export namespace ToastRoot {
  export type State = ToastRootState;
  export type Props = ToastRootProps;
}

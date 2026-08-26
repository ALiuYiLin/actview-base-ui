import { toRefs, unrefs, computed } from 'actview';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { ToastRootContext } from './ToastRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Renders a toast.
 * Renders a `<div>` element.
 *
 * actview 简化：children 为渲染函数 `(props) => ReactNode`，props 包含
 * toast 的全部字段与 `close`；自动关闭计时（timeout）未迁移。
 */
export function ToastRoot(componentProps: ToastRoot.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {toast: toastProp} = componentProps as any;
  const {children, ref: refProp, ...elementProps} = toRefs(componentProps);

  const store = useToastProviderContext(false);
  const toasts = store.useState('toasts');

  // 渲染期查找（computed 惰性求值）：toast 变化时同步更新
  const toast = computed(() =>
    toasts.value.find((t: any) => t.id === (toastProp?.id ?? toastProp)),
  );

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children: () => {
      const t = toast.value;
      if (!t) {
        return null;
      }
      const content = children?.value;
      return typeof content === 'function'
        ? content({...t, close: () => store.closeToast(t.id)})
        : content;
    },
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ToastRootContext.Provider
      value={
        toast.value
          ? ({toast: toast.value, close: () => store.closeToast(toast.value.id)} as any)
          : (undefined as any)
      }
    >
      {toast.value ? element() : null}
    </ToastRootContext.Provider>
  );
}

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

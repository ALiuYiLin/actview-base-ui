import { toRefs, unrefs } from 'actview';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * actview 简化：children 为渲染函数 `(toast, index) => ReactNode`；
 * 布局元数据（offsetY/height）未迁移。
 */
export function ToastViewport(componentProps: ToastViewport.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useToastProviderContext(false);
  const toasts = store.useState('toasts');
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLDivElement | null) => {
          store.state.viewport = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children: () => {
      const childFn = children?.value;
      if (typeof childFn === 'function') {
        return toasts.value.map((toast: any, index: number) => childFn(toast, index));
      }
      return null;
    },
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ToastViewportState {}

export interface ToastViewportProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastViewport {
  export type State = ToastViewportState;
  export type Props = ToastViewportProps;
}

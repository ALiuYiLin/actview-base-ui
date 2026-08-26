import { toRefs, unrefs } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The title of the toast. Renders a `<div>` element. */
export function ToastTitle(props: ToastTitle.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useToastRootContext(false);
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: () => context.toast,
    className,
    style,
    render,
    children: () => children?.value ?? context.toast.title,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ToastTitleProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastTitle {
  export type Props = ToastTitleProps;
}

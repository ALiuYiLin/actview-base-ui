import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** Displays an element positioned against the toast. Renders a `<div>` element. */
export function ToastArrow(props: ToastArrow.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{'aria-hidden': true}, unrefs(elementProps)],
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ToastArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastArrow {
  export type Props = ToastArrowProps;
}

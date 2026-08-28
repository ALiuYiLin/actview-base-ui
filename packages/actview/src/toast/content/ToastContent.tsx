import { toRefs, unrefs } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** A container for the toast content. Renders a `<div>` element. */
export function ToastContent(props: ToastContent.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useToastRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ToastContentProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastContent {
  export type Props = ToastContentProps;
}

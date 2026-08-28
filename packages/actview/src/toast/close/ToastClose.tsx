import { toRefs, unrefs } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** A button that closes the toast. Renders a `<button>` element. */
export function ToastClose(props: ToastClose.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useToastRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [
      {
        type: 'button' as const,
        onClick() {
          context.close();
        },
        ...unrefs(elementProps),
      },
    ],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ToastCloseProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastClose {
  export type Props = ToastCloseProps;
}

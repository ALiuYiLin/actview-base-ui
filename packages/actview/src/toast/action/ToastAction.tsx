import { toRefs, unrefs } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** A button for the toast action. Renders a `<button>` element with the toast's actionProps. */
export function ToastAction(props: ToastAction.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useToastRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [
      {
        type: 'button' as const,
        ...(context.toast.actionProps ?? {}),
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

export interface ToastActionProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastAction {
  export type Props = ToastActionProps;
}

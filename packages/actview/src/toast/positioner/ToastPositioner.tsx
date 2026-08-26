import { toRefs, unrefs } from 'actview';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Positions the toast. Renders a `<div>` element. actview 简化：无定位计算。 */
export function ToastPositioner(props: ToastPositioner.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useToastRootContext(true);
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [
      {
        ...(context?.toast?.positionerProps ?? {}),
      },
      unrefs(elementProps),
    ],
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ToastPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastPositioner {
  export type Props = ToastPositionerProps;
}

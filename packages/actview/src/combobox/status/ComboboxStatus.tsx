import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** A status for screen readers. Renders a `<div>` element. actview 简化：静态渲染。 */
export function ComboboxStatus(props: ComboboxStatus.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxStatusProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxStatus {
  export type Props = ComboboxStatusProps;
}

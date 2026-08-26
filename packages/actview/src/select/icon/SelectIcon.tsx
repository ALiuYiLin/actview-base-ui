import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** Displays a chevron icon. Renders a `<span>` element. */
export function SelectIcon(props: SelectIcon.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{'aria-hidden': true}, unrefs(elementProps)],
    className,
    style,
    render,
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface SelectIconProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectIcon {
  export type Props = SelectIconProps;
}

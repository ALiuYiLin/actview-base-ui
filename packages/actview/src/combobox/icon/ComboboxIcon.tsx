import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** Displays a chevron icon. Renders a `<span>` element. */
export function ComboboxIcon(props: ComboboxIcon.Props) {
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

export interface ComboboxIconProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxIcon {
  export type Props = ComboboxIconProps;
}

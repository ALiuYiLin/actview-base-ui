import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** Displays an arrow indicator. Renders a `<div>` element. */
export function ComboboxArrow(props: ComboboxArrow.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  // 渲染合并统一走 useRenderElement（className/style 函数、render prop 分支、children）
  const {element} = useRenderElement({
    props: () => [{'aria-hidden': true}, unrefs(elementProps)],
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件 wrapComponentFn 转换为渲染函数）============
  // 无外层 JSX 结构的简单组件用 Fragment 包裹 element()（actview Fragment 不产生 DOM 节点）。
  return <>{element()}</>;
}

export interface ComboboxArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxArrow {
  export type Props = ComboboxArrowProps;
}

import { toRefs, unrefs } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** Displays an arrow indicator. Renders a `<div>` element. */
export function NavigationMenuArrow(props: NavigationMenuArrow.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);
  const context = useNavigationMenuRootContext(true);

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

export interface NavigationMenuArrowProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuArrow {
  export type Props = NavigationMenuArrowProps;
}

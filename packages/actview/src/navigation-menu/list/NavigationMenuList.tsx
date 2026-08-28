import { toRefs, unrefs } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** A list of navigation menu items. Renders a `<div>` element. */
export function NavigationMenuList(props: NavigationMenuList.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);
  const context = useNavigationMenuRootContext(true);

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

export interface NavigationMenuListProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuList {
  export type Props = NavigationMenuListProps;
}

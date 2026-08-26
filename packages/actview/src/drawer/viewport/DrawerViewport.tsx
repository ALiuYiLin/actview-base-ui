import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** A viewport for the drawer. Renders a `<div>` element. actview 简化：无虚拟键盘/缩进布局。 */
export function DrawerViewport(props: DrawerViewport.Props) {
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

export interface DrawerViewportProps {
  children?: any;
  [key: string]: any;
}

export namespace DrawerViewport {
  export type Props = DrawerViewportProps;
}

import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** The content of the drawer. Renders a `<div>` element. */
export function DrawerContent(props: DrawerContent.Props) {
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

export interface DrawerContentProps {
  children?: any;
  [key: string]: any;
}

export namespace DrawerContent {
  export type Props = DrawerContentProps;
}

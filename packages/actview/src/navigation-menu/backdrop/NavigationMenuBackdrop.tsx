import { toRefs, unrefs, computed } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** A backdrop for the popup. Renders a `<div>` element. */
export function NavigationMenuBackdrop(props: NavigationMenuBackdrop.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);
  const context = useNavigationMenuRootContext(false);
  const open = computed(() => context.openRef.value);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!open.value ? null : element()}</>;
}

export interface NavigationMenuBackdropProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuBackdrop {
  export type Props = NavigationMenuBackdropProps;
}

import { toRefs, unrefs } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Positions the popup. Renders a `<div>` element. actview 简化：无定位计算。 */
export function NavigationMenuPositioner(props: NavigationMenuPositioner.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useNavigationMenuRootContext(true);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: any) => {
          context?.setPositionerElement?.(el ?? null);
        },
      ];
      if (props.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface NavigationMenuPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuPositioner {
  export type Props = NavigationMenuPositionerProps;
}

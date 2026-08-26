import { toRefs, unrefs } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** A link in the navigation menu. Renders an `<a>` element. */
export function NavigationMenuLink(componentProps: NavigationMenuLink.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useNavigationMenuRootContext(true);
  const {render, className, style, children, ref: refProp, value, ...elementProps} =
    toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const elementPropsValue = unrefs(elementProps);
      return [
        {
          ...elementPropsValue,
          href: elementPropsValue.href ?? '#',
          onClick: () => {
            if (value?.value != null) {
              context?.setValue?.(value.value);
            }
          },
        },
      ];
    },
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'a',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface NavigationMenuLinkProps {
  /**
   * The value of the link.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuLink {
  export type Props = NavigationMenuLinkProps;
}

import { toRefs, unrefs } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** An individual navigation menu item. Renders a `<button>` element. */
export function NavigationMenuItem(componentProps: NavigationMenuItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useNavigationMenuRootContext(false);
  const {render, className, style, children, ref: refProp, value, ...elementProps} =
    toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [
      {
        type: 'button',
        ...unrefs(elementProps),
        onClick: () => {
          if (!context.disabled && value?.value != null) {
            context.setValue(value.value);
          }
        },
      },
    ],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface NavigationMenuItemProps {
  /**
   * The value of the item.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuItem {
  export type Props = NavigationMenuItemProps;
}

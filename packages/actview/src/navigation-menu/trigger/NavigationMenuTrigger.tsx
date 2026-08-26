import { toRefs, unrefs, computed } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A trigger for the navigation menu.
 * Renders a `<button>` element.
 *
 * actview 简化：hover/点击均切换 open（鼠标进入与按下）；键盘导航未接线
 * （floating-ui actview 层 useListNavigation 已完整移植）。
 */
export function NavigationMenuTrigger(componentProps: NavigationMenuTrigger.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useNavigationMenuRootContext(false);
  const {render, className, style, children, ref: refProp, value, ...elementProps} =
    toRefs(componentProps);
  const isActive = computed(() => context.valueRef.value === value?.value);

  const {element} = useRenderElement({
    props: () => {
      const handleEnter = () => {
        if (!context.disabled && value?.value != null) {
          context.setValue(value.value);
        }
      };
      const handleClick = () => {
        if (!context.disabled) {
          if (value?.value != null) {
            context.setValue(context.valueRef.value === value.value ? null : value.value);
          }
        }
      };
      return [
        {
          type: 'button',
          ...unrefs(elementProps),
          'data-active': isActive.value ? '' : undefined,
          onClick: handleClick,
          onMouseEnter: handleEnter,
        },
      ];
    },
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

export interface NavigationMenuTriggerProps {
  /**
   * The value of the item this trigger opens.
   */
  value?: any;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuTrigger {
  export type Props = NavigationMenuTriggerProps;
}

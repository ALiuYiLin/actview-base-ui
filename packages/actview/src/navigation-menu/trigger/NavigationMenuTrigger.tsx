import { defineComponent, computed, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/**
 * A trigger for the navigation menu.
 * Renders a `<button>` element.
 *
 * actview 简化：hover/点击均切换 open（鼠标进入与按下）；键盘导航未迁移。
 */
export const NavigationMenuTrigger = defineComponent(function NavigationMenuTrigger(
  componentProps: NavigationMenuTrigger.Props,
) {
  const context = useNavigationMenuRootContext(false);
  const children = toValue(componentProps.children);
  const isActive = computed(() => context.valueRef.value === (componentProps as any).value);

  return () => {
    const {render, className, style, value, ...elementProps} = componentProps as any;

    const handleEnter = () => {
      if (!context.disabled && value != null) {
        context.setValue(value);
      }
    };

    const handleClick = () => {
      if (!context.disabled) {
        if (value != null) {
          context.setValue(context.valueRef.value === value ? null : value);
        }
      }
    };

    const merged: any = {
      type: 'button',
      ...elementProps,
      'data-active': isActive.value ? '' : undefined,
      onClick: handleClick,
      onMouseEnter: handleEnter,
    };

    const ref = (el: any) => {
      if (componentProps.ref) {
        if (typeof componentProps.ref === 'function') (componentProps.ref as any)(el);
        else {
          (componentProps.ref as any).value = el;
          (componentProps.ref as any).current = el;
        }
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref} as any);
      }
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <button {...merged} ref={ref}>{children}</button>;
  };
});

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

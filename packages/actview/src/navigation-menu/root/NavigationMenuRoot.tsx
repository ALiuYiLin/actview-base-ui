import { defineComponent, ref, toValue, watch, computed } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { NavigationMenuRootContext } from './NavigationMenuRootContext';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * Groups all parts of the navigation menu.
 * Renders a `<div>` element.
 *
 * actview 简化：无 floatingRootContext 集成（positioner 无定位计算）、
 * 无 viewport 布局动画、无点击外关闭（useDismiss 遗留）。
 */
export const NavigationMenuRoot = defineComponent(function NavigationMenuRoot(
  componentProps: NavigationMenuRoot.Props,
) {
  const {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    orientation = 'horizontal',
    modal = true,
    disabled = false,
    children,
  } = componentProps as any;

  const [valueState, setValueState] = useControlled<any>({
    controlled: valueProp,
    default: defaultValue,
    name: 'NavigationMenuRoot',
    state: 'value',
  });

  const value = ref(valueState.value);
  watch(
    () => valueState.value,
    (v) => (value.value = v),
    {immediate: true},
  );

  const positionerElement = ref<HTMLElement | null>(null);
  const popupElement = ref<HTMLElement | null>(null);
  const viewportElement = ref<HTMLElement | null>(null);
  const rootRef = ref<HTMLElement | null>(null);
  const activationDirection = ref<'left' | 'right' | 'up' | 'down' | null>(null);

  const open = computed(() => value.value != null);

  const setValue = (nextValue: any) => {
    value.value = nextValue;
    setValueState(nextValue);
    if (nextValue !== null) {
      onValueChange?.(nextValue, {value: nextValue});
    }
  };

  const contextValue = {
    open: open.value,
    openRef: open,
    value: value.value,
    valueRef: value,
    setValue,
    positionerElement: positionerElement.value,
    setPositionerElement: (el: HTMLElement | null) => (positionerElement.value = el),
    popupElement: popupElement.value,
    setPopupElement: (el: HTMLElement | null) => (popupElement.value = el),
    viewportElement: viewportElement.value,
    setViewportElement: (el: HTMLElement | null) => (viewportElement.value = el),
    rootRef,
    disabled,
    modal,
    orientation,
    activationDirection: activationDirection.value,
    setActivationDirection: (direction: 'left' | 'right' | 'up' | 'down' | null) =>
      (activationDirection.value = direction),
  };

  const state = (): NavigationMenuRootState => ({
    open: open.value,
    value: value.value,
    orientation,
    modal,
    disabled,
    activationDirection: activationDirection.value,
  });

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;
    const child = typeof children === 'function' ? children(state()) : toValue(children);

    const merged: any = {...elementProps};
    if (modal) {
      merged['data-modal'] = '';
    }

    const mergedRefs = (el: HTMLElement | null) => {
      rootRef.value = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        (componentProps.ref as any).current = el;
      }
    };

    const element = (() => {
      if (render) {
        if (typeof render === 'function') {
          return render({...merged, ...state(), ref: mergedRefs} as any);
        }
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{child}</Tag>;
      }
      return <div {...merged} ref={mergedRefs}>{child}</div>;
    })();

    return (
      <NavigationMenuRootContext.Provider value={contextValue as any}>
        {element}
      </NavigationMenuRootContext.Provider>
    );
  };
});

export interface NavigationMenuRootState {
  /**
   * Whether the navigation menu is open.
   */
  open: boolean;
  /**
   * The value of the currently open item.
   */
  value: any;
  /**
   * The orientation of the navigation menu.
   */
  orientation: 'horizontal' | 'vertical';
  /**
   * Whether the navigation menu is modal.
   */
  modal: boolean;
  /**
   * Whether the navigation menu is disabled.
   */
  disabled: boolean;
  /**
   * The activation direction.
   */
  activationDirection: 'left' | 'right' | 'up' | 'down' | null;
}

export interface NavigationMenuRootProps
  extends BaseUIComponentProps<'div', NavigationMenuRootState> {
  /**
   * The value of the currently open item.
   */
  value?: any;
  /**
   * The default value of the currently open item.
   */
  defaultValue?: any;
  /**
   * Event handler called when the value changes.
   */
  onValueChange?: ((value: any, eventDetails: {value: any}) => void) | undefined;
  /**
   * The orientation of the navigation menu.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical' | undefined;
  /**
   * Whether the navigation menu is modal.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Whether the navigation menu is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuRoot {
  export type State = NavigationMenuRootState;
  export type Props = NavigationMenuRootProps;
}

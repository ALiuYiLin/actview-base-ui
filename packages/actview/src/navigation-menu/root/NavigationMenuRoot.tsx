import { ref, toValue, watch, computed, toRefs, unrefs } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { NavigationMenuRootContext } from './NavigationMenuRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Groups all parts of the navigation menu.
 * Renders a `<div>` element.
 *
 * actview 简化：无 floatingRootContext 集成（positioner 无定位计算）、
 * 无 viewport 布局动画、无点击外关闭（useDismiss 遗留）。
 */
export function NavigationMenuRoot(componentProps: NavigationMenuRoot.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    orientation = 'horizontal',
    modal = true,
    disabled = false,
  } = componentProps as any;

  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

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

  const state = (): NavigationMenuRootState => ({
    open: open.value,
    value: value.value,
    orientation,
    modal,
    disabled,
    activationDirection: activationDirection.value,
  });

  const {element} = useRenderElement({
    props: () => {
      const merged: any = {...unrefs(elementProps)};
      if (modal) {
        merged['data-modal'] = '';
      }
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLElement | null) => {
          rootRef.value = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children: () => {
      const child = children?.value;
      return typeof child === 'function' ? child(state()) : child;
    },
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <NavigationMenuRootContext.Provider
      value={
        {
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
        } as any
      }
    >
      {element()}
    </NavigationMenuRootContext.Provider>
  );
}

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

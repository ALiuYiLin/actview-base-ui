import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { NavigationMenuRootContext } from './NavigationMenuRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups all parts of the navigation menu.
 * Renders a `<div>` element.
 *
 * actview 简化：无 floatingRootContext 集成（positioner 无定位计算）、
 * 无 viewport 布局动画、无点击外关闭（useDismiss 遗留）。
 */
export function NavigationMenuRoot(componentProps: NavigationMenuRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）；
  // 回调类 props（onValueChange）事件期直读 componentProps。
  const orientation = computed(() => componentProps.orientation ?? 'horizontal');
  const modal = computed(() => componentProps.modal ?? true);
  const disabled = computed(() => componentProps.disabled ?? false);

  // 值形 props toRefs 活引用；children 单独排除（render prop 需函数调用后
  // 作为 children 覆盖注入）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  const [valueState, setValueState] = useControlled<any>({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue ?? null,
    name: 'NavigationMenuRoot',
    state: 'value',
  });

  const value = computed(() => valueState.value);

  const positionerElement = ref<HTMLElement | null>(null);
  const popupElement = ref<HTMLElement | null>(null);
  const viewportElement = ref<HTMLElement | null>(null);
  const rootRef = ref<HTMLElement | null>(null);
  const activationDirection = ref<'left' | 'right' | 'up' | 'down' | null>(null);

  const open = computed(() => value.value != null);

  // 事件 handler：setup 闭包读 props——事件触发时拿到实时值。
  const setValue = (nextValue: any) => {
    setValueState(nextValue);
    if (nextValue !== null) {
      componentProps.onValueChange?.(nextValue, {value: nextValue});
    }
  };

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<NavigationMenuRootState>(() => ({
    open: open.value,
    value: value.value,
    orientation: orientation.value,
    modal: modal.value,
    disabled: disabled.value,
    activationDirection: activationDirection.value,
  }));

  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = {...elementProps.value, children: childrenOverride.value};
    if (modal.value) {
      merged['data-modal'] = '';
    }
    return merged;
  });

  // children 兼容 render prop（渲染期求值，表达式内直读）。
  const childrenOverride = computed(() => {
    const child = childrenRef?.value;
    return typeof child === 'function' ? child(state.value) : child;
  });

  // store-as-is 载体：身份稳定的 getter 对象——open/value/elements/direction
  // 渲染期求值；setValue/setter/refs 为稳定引用。
  const contextValue = {
    get open() {
      return open.value;
    },
    openRef: open,
    get value() {
      return value.value;
    },
    valueRef: value,
    setValue,
    get positionerElement() {
      return positionerElement.value;
    },
    setPositionerElement: (el: HTMLElement | null) => (positionerElement.value = el),
    get popupElement() {
      return popupElement.value;
    },
    setPopupElement: (el: HTMLElement | null) => (popupElement.value = el),
    get viewportElement() {
      return viewportElement.value;
    },
    setViewportElement: (el: HTMLElement | null) => (viewportElement.value = el),
    rootRef,
    get disabled() {
      return disabled.value;
    },
    get modal() {
      return modal.value;
    },
    get orientation() {
      return orientation.value;
    },
    get activationDirection() {
      return activationDirection.value;
    },
    setActivationDirection: (direction: 'left' | 'right' | 'up' | 'down' | null) =>
      (activationDirection.value = direction),
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <NavigationMenuRootContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
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

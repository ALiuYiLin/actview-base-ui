import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import { MenuRadioGroupContext } from './MenuRadioGroupContext';
import { MenuGroupContext } from '../group/MenuGroupContext';
import { useControlled } from '@/utils/useControlled';
import { useStableCallback } from '@/utils/useStableCallback';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups related radio items.
 * Renders a `<div>` element.
 */
export function MenuRadioGroup(componentProps: MenuRadioGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）；
  // 回调类 props（onValueChange）事件期直读 componentProps。
  const disabled = computed(() => componentProps.disabled ?? false);
  const ariaLabelledByProp = computed(() => componentProps['aria-labelledby']);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const labelId = ref<string | undefined>(undefined);

  const setLabelId = (
    value: string | undefined | ((current: string | undefined) => string | undefined),
  ) => {
    labelId.value = typeof value === 'function' ? (value as any)(labelId.value) : value;
  };

  const [value, setValueUnwrapped] = useControlled<any>({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue,
    name: 'MenuRadioGroup',
  });

  // 事件 handler：setup 闭包读 props——事件触发时拿到实时值。
  const setValue = useStableCallback((newValue: any, eventDetails: any) => {
    componentProps.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(newValue);
  });

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuRadioGroupState>(() => ({disabled: disabled.value}));

  const rootProps = computed<Record<string, any>>(() => ({
    role: 'group',
    'aria-labelledby': ariaLabelledByProp.value ?? labelId.value,
    'aria-disabled': disabled.value || undefined,
    ...elementProps.value,
  }));

  // store-as-is 载体：身份稳定的 getter 对象——value/disabled 渲染期求值。
  const radioGroupContextValue = {
    get value() {
      return value.value;
    },
    setValue,
    get disabled() {
      return disabled.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuGroupContext.Provider value={setLabelId as any}>
      <MenuRadioGroupContext.Provider value={radioGroupContextValue as any}>
        {useRenderElement(
          'div',
          {
            className: className?.value,
            render: render?.value,
            style: style?.value,
          },
          {
            state: state.value,
            ref: componentProps.ref as any,
            props: rootProps.value,
          },
        )}
      </MenuRadioGroupContext.Provider>
    </MenuGroupContext.Provider>
  );
}

export interface MenuRadioGroupProps {
  /**
   * The content of the component.
   */
  children?: any;
  /**
   * The controlled value of the radio item that should be currently selected.
   */
  value?: any;
  /**
   * The uncontrolled value of the radio item that should be initially selected.
   */
  defaultValue?: any;
  /**
   * Function called when the selected value changes.
   */
  onValueChange?: ((value: any, eventDetails: any) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   *
   * @default false
   */
  disabled?: boolean | undefined;
  [key: string]: any;
}

export interface MenuRadioGroupState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
}

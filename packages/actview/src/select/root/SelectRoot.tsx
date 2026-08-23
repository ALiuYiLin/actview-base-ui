import { defineComponent, toValue, onUnmounted } from 'actview';
import { createSelectStore } from '../store';
import { SelectRootContext } from './SelectRootContext';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * Groups all parts of the select.
 * Doesn't render its own HTML element.
 *
 * actview 简化：无 focus 管理/键盘导航/滚动箭头；
 * items 为受控数据（Record 或数组），按 index 顺序渲染。
 */
export const SelectRoot = defineComponent(function SelectRoot(props: SelectRoot.Props) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    items,
    multiple = false,
    modal = true,
    disabled = false,
    children,
    name,
  } = props as any;

  const store = createSelectStore({
    id: name,
    modal,
    multiple,
    disabled,
    items,
    value: valueProp !== undefined ? valueProp : defaultValue,
  });

  // actview 的 store.state 非响应式对象：用 subscribe 监听 setState 后的值变化。
  let lastValue = store.state.value;
  const unsubscribe = store.subscribe(() => {
    const next = store.state.value;
    if (next !== lastValue && next !== undefined) {
      lastValue = next;
      onValueChange?.(next, {value: next});
    }
  });
  onUnmounted(() => {
    unsubscribe();
  });

  const state = (): SelectRootState => ({
    value: store.state.value,
    open: store.state.open,
    mounted: store.state.mounted,
    multiple: store.state.multiple,
    disabled,
  });

  return () => {
    const child = typeof children === 'function' ? children(state()) : toValue(children);

    return (
      <SelectRootContext.Provider value={store as any}>
        {child}
      </SelectRootContext.Provider>
    );
  };
});

export interface SelectRootState {
  /**
   * The selected value.
   */
  value: any;
  /**
   * Whether the select is open.
   */
  open: boolean;
  /**
   * Whether the select is mounted.
   */
  mounted: boolean;
  /**
   * Whether the select allows multiple selection.
   */
  multiple: boolean;
  /**
   * Whether the select is disabled.
   */
  disabled: boolean;
}

export interface SelectRootProps {
  /**
   * The controlled value of the select.
   */
  value?: any;
  /**
   * The default value of the select.
   */
  defaultValue?: any;
  /**
   * Event handler called when the value changes.
   */
  onValueChange?: ((value: any, eventDetails: {value: any}) => void) | undefined;
  /**
   * The items to render.
   */
  items?: any;
  /**
   * Whether the select allows multiple selection.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Whether the select is modal.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Whether the select is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The name of the select.
   */
  name?: string | undefined;
  children?: any;
  [key: string]: any;
}

export namespace SelectRoot {
  export type State = SelectRootState;
  export type Props = SelectRootProps;
}

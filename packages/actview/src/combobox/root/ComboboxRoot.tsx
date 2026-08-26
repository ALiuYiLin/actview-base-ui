import { defineComponent, ref, toValue, computed } from 'actview';
import { createComboboxStore } from '../store';
import { createComboboxItems } from '../items/createItems';
import { ComboboxRootContext } from './ComboboxRootContext';

/**
 * Groups all parts of the combobox.
 * Doesn't render its own HTML element.
 *
 * actview 简化：组件未接线 floating-ui actview 层的键盘导航/focus（该层
 * useListNavigation/FloatingFocusManager 已完整移植，见 @actview/floating-ui）；
 * items 按 inputValue 过滤（createComboboxItems 简化版）。
 */
export const ComboboxRoot = defineComponent(function ComboboxRoot(props: ComboboxRoot.Props) {
  const {
    items,
    defaultValue,
    value: valueProp,
    defaultInputValue = '',
    onValueChange,
    onInputValueChange,
    multiple = false,
    disabled = false,
    children,
  } = props as any;

  const store = createComboboxStore({
    items,
    selectedValue: valueProp !== undefined ? valueProp : defaultValue,
    multiple,
    disabled,
  });

  const inputValue = ref(defaultInputValue);
  const inputValueRef = inputValue;

  const filteredItems = computed(() =>
    createComboboxItems({items, inputValue: inputValue.value} as any),
  );

  const setInputValue = (nextValue: string) => {
    inputValue.value = nextValue;
    onInputValueChange?.(nextValue, {inputValue: nextValue});
    store.open();
  };

  // actview 的 store.state 非响应式：subscribe 监听选择变化。
  let lastValue = store.state.selectedValue;
  store.subscribe(() => {
    const next = store.state.selectedValue;
    if (next !== lastValue) {
      lastValue = next;
      onValueChange?.(next, {value: next});
    }
  });

  const state = (): ComboboxRootState => ({
    value: store.state.selectedValue,
    open: store.state.open,
    inputValue: inputValue.value,
    items: filteredItems.value,
    multiple: store.state.multiple,
    disabled: store.state.disabled,
  });

  return () => {
    const child = typeof children === 'function' ? children(state()) : toValue(children);

    return (
      <ComboboxRootContext.Provider
        value={
          {
            store,
            inputValue: inputValue.value,
            inputValueRef,
            setInputValue,
            itemsRef: filteredItems,
          } as any
        }
      >
        {child}
      </ComboboxRootContext.Provider>
    );
  };
});

export interface ComboboxRootState {
  /**
   * The selected value.
   */
  value: any;
  /**
   * Whether the combobox is open.
   */
  open: boolean;
  /**
   * The current input value.
   */
  inputValue: string;
  /**
   * The filtered items.
   */
  items: any[];
  /**
   * Whether the combobox allows multiple selection.
   */
  multiple: boolean;
  /**
   * Whether the combobox is disabled.
   */
  disabled: boolean;
}

export interface ComboboxRootProps {
  /**
   * The items to render.
   */
  items?: any;
  /**
   * The controlled selected value.
   */
  value?: any;
  /**
   * The default selected value.
   */
  defaultValue?: any;
  /**
   * The controlled input value.
   */
  inputValue?: string | undefined;
  /**
   * The default input value.
   * @default ''
   */
  defaultInputValue?: string | undefined;
  /**
   * Event handler called when the selected value changes.
   */
  onValueChange?: ((value: any, eventDetails: {value: any}) => void) | undefined;
  /**
   * Event handler called when the input value changes.
   */
  onInputValueChange?:
    | ((inputValue: string, eventDetails: {inputValue: string}) => void)
    | undefined;
  /**
   * Whether the combobox allows multiple selection.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Whether the combobox is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace ComboboxRoot {
  export type State = ComboboxRootState;
  export type Props = ComboboxRootProps;
}

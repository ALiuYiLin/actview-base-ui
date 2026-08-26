import { defineComponent, ref, toValue, computed, onUnmounted } from 'actview';
import { createComboboxStore } from '@/combobox/store';
import { createComboboxItems } from '@/combobox/items/createItems';
import { ComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { AutocompleteRootContext } from './AutocompleteRootContext';

/**
 * Groups all parts of the autocomplete.
 * Doesn't render its own HTML element.
 *
 * actview 简化：组件未接线 floating-ui actview 层的键盘导航/focus（该层
 * useListNavigation/FloatingFocusManager 已完整移植，见 @actview/floating-ui）；
 * items 按 inputValue 过滤（createComboboxItems 简化版）。
 */
export const AutocompleteRoot = defineComponent(function AutocompleteRoot(
  props: AutocompleteRoot.Props,
) {
  const {
    items,
    defaultValue,
    value: valueProp,
    defaultInputValue = '',
    onValueChange,
    onInputValueChange,
    disabled = false,
    children,
  } = props as any;

  const store = createComboboxStore({
    items,
    selectedValue: valueProp !== undefined ? valueProp : defaultValue,
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
  const unsubscribe = store.subscribe(() => {
    const next = store.state.selectedValue;
    if (next !== lastValue) {
      lastValue = next;
      onValueChange?.(next, {value: next});
    }
  });
  onUnmounted(() => {
    unsubscribe();
  });

  const state = (): AutocompleteRootState => ({
    value: store.state.selectedValue,
    open: store.state.open,
    inputValue: inputValue.value,
    items: filteredItems.value,
    disabled: store.state.disabled,
  });

  return () => {
    const child = typeof children === 'function' ? children(state()) : toValue(children);

    const contextValue = {
      store,
      inputValue: inputValue.value,
      inputValueRef,
      setInputValue,
      itemsRef: filteredItems,
      selectedValue: store.state.selectedValue,
    };

    // 同时提供 ComboboxRootContext（复用 combobox 部件读它）与 AutocompleteRootContext。
    return (
      <AutocompleteRootContext.Provider value={contextValue as any}>
        <ComboboxRootContext.Provider value={contextValue as any}>
          {child}
        </ComboboxRootContext.Provider>
      </AutocompleteRootContext.Provider>
    );
  };
});

export interface AutocompleteRootState {
  /**
   * The selected value.
   */
  value: any;
  /**
   * Whether the autocomplete is open.
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
   * Whether the autocomplete is disabled.
   */
  disabled: boolean;
}

export interface AutocompleteRootProps {
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
   * Whether the autocomplete is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace AutocompleteRoot {
  export type State = AutocompleteRootState;
  export type Props = AutocompleteRootProps;
}

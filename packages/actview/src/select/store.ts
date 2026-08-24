import { ReactStore } from '@/internals/store';
import type { Ref } from 'actview';

export type State = {
  id: string | undefined;
  labelId: string | undefined;
  modal: boolean;
  multiple: boolean;
  disabled: boolean;
  items: any;
  itemToStringLabel: ((item: any) => string) | undefined;
  itemToStringValue: ((item: any) => string) | undefined;
  isItemEqualToValue: (itemValue: any, selectedValue: any) => boolean;
  value: any;
  open: boolean;
  mounted: boolean;
  forceMount: boolean;
  transitionStatus: string;
  openMethod: string | null;
  activeIndex: number | null;
  selectedIndex: number | null;
  popupProps: Record<string, any>;
  triggerProps: Record<string, any>;
  triggerElement: HTMLElement | null;
  positionerElement: HTMLElement | null;
  listElement: HTMLElement | null;
  popupSide: string | null;
  scrollUpArrowVisible: boolean;
  scrollDownArrowVisible: boolean;
  hasScrollArrows: boolean;
};

export function compareItemEquality(
  itemValue: any,
  selectedValue: any,
  comparer: (a: any, b: any) => boolean,
) {
  if (itemValue === selectedValue) {
    return true;
  }
  if (typeof comparer === 'function') {
    return comparer(itemValue, selectedValue);
  }
  return false;
}

export function stringifyAsValue(value: any, itemToStringValue?: (item: any) => string) {
  if (typeof itemToStringValue === 'function') {
    return itemToStringValue(value);
  }
  return String(value);
}

export const selectors = {
  id: (state: State) => state.id,
  labelId: (state: State) => state.labelId,
  modal: (state: State) => state.modal,
  multiple: (state: State) => state.multiple,
  items: (state: State) => state.items,
  itemToStringLabel: (state: State) => state.itemToStringLabel,
  isItemEqualToValue: (state: State) => state.isItemEqualToValue,
  value: (state: State) => state.value,
  hasSelectedValue: (state: State) => {
    const {value, multiple, itemToStringValue} = state;
    if (value == null) {
      return false;
    }
    if (multiple && Array.isArray(value)) {
      return value.length > 0;
    }
    return stringifyAsValue(value, itemToStringValue) !== '';
  },
  open: (state: State) => state.open,
  mounted: (state: State) => state.mounted,
  forceMount: (state: State) => state.forceMount,
  transitionStatus: (state: State) => state.transitionStatus,
  openMethod: (state: State) => state.openMethod,
  activeIndex: (state: State) => state.activeIndex,
  selectedIndex: (state: State) => state.selectedIndex,
  isActive: (state: State, index: number) => state.activeIndex === index,
  isSelected: (state: State, itemValue: any) => {
    const comparer = state.isItemEqualToValue;
    const storeValue = state.value;
    if (state.multiple) {
      return (
        Array.isArray(storeValue) &&
        storeValue.some((selectedItem: any) =>
          compareItemEquality(itemValue, selectedItem, comparer),
        )
      );
    }
    return compareItemEquality(itemValue, storeValue, comparer);
  },
  isSelectedByFocus: (state: State, index: number) => state.selectedIndex === index,
  triggerProps: (state: State) => state.triggerProps,
  triggerElement: (state: State) => state.triggerElement,
  positionerElement: (state: State) => state.positionerElement,
  listElement: (state: State) => state.listElement,
  popupSide: (state: State) => state.popupSide,
  scrollUpArrowVisible: (state: State) => state.scrollUpArrowVisible,
  scrollDownArrowVisible: (state: State) => state.scrollDownArrowVisible,
  hasScrollArrows: (state: State) => state.hasScrollArrows,
};

type Selectors = typeof selectors;

function defaultState(initial: Partial<State> = {}): State {
  return {
    id: undefined,
    labelId: undefined,
    modal: true,
    multiple: false,
    disabled: false,
    items: undefined,
    itemToStringLabel: undefined,
    itemToStringValue: undefined,
    isItemEqualToValue: (a: any, b: any) => a === b,
    value: undefined,
    open: false,
    mounted: false,
    forceMount: false,
    transitionStatus: 'unmounted',
    openMethod: null,
    activeIndex: null,
    selectedIndex: null,
    popupProps: {},
    triggerProps: {},
    triggerElement: null,
    positionerElement: null,
    listElement: null,
    popupSide: null,
    scrollUpArrowVisible: false,
    scrollDownArrowVisible: false,
    hasScrollArrows: false,
    ...initial,
  };
}

export type SelectStore = ReactStore<Readonly<State>, {}, Selectors> & SelectMethods;

export interface SelectMethods {
  setValue: (value: any) => void;
  selectValue: (value: any) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  open: () => void;
  close: () => void;
  setActiveIndex: (index: number | null) => void;
  setPopupProps: (props: Record<string, any>) => void;
  setTriggerProps: (props: Record<string, any>) => void;
  setPositionerElement: (el: HTMLElement | null) => void;
  setListElement: (el: HTMLDivElement | null) => void;
}

/**
 * Creates the select store.
 * actview 简化：无滚动箭头检测（hasScrollArrows 恒 false）；focus 管理未接线
 * （floating-ui actview 层 FloatingFocusManager 已完整移植，focusTrigger 未迁移）。
 */
export function createSelectStore(initialState: Partial<State> = {}): SelectStore {
  const store = new ReactStore<Readonly<State>, {}, Selectors>(
    defaultState(initialState),
    {},
    selectors,
  );

  const methods: SelectMethods = {
    setValue(value: any) {
      store.setState({...store.state, value} as any);
    },
    selectValue(value: any) {
      store.setState({...store.state, value, open: false, mounted: false} as any);
    },
    setOpen(open: boolean) {
      store.setState({...store.state, open, mounted: open} as any);
    },
    toggleOpen() {
      methods.setOpen(!store.state.open);
    },
    open() {
      methods.setOpen(true);
    },
    close() {
      methods.setOpen(false);
    },
    setActiveIndex(index: number | null) {
      store.setState({...store.state, activeIndex: index} as any);
    },
    setPopupProps(props: Record<string, any>) {
      store.setState({...store.state, popupProps: props} as any);
    },
    setTriggerProps(props: Record<string, any>) {
      store.setState({...store.state, triggerProps: props} as any);
    },
    setPositionerElement(el: HTMLElement | null) {
      store.setState({...store.state, positionerElement: el} as any);
    },
    setListElement(el: HTMLDivElement | null) {
      store.setState({...store.state, listElement: el} as any);
    },
  };

  return Object.assign(store, methods);
}

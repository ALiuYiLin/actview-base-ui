import { ReactStore } from '@/internals/store';

export type State = {
  id: string | undefined;
  labelId: string | undefined;
  items: readonly any[] | undefined;
  selectedValue: any;
  open: boolean;
  mounted: boolean;
  transitionStatus: string;
  forceMounted: boolean;
  activeIndex: number | null;
  selectedIndex: number | null;
  positionerElement: HTMLElement | null;
  listElement: HTMLElement | null;
  triggerElement: HTMLElement | null;
  inputElement: HTMLInputElement | null;
  inputGroupElement: HTMLDivElement | null;
  popupSide: string | null;
  openMethod: string | null;
  inputInsidePopup: boolean;
  inputOwnsFormValue: boolean;
  multiple: boolean;
  disabled: boolean;
};

export const selectors = {
  id: (state: State) => state.id,
  labelId: (state: State) => state.labelId,
  items: (state: State) => state.items,
  selectedValue: (state: State) => state.selectedValue,
  hasSelectedValue: (state: State) => state.selectedValue != null,
  open: (state: State) => state.open,
  mounted: (state: State) => state.mounted,
  transitionStatus: (state: State) => state.transitionStatus,
  forceMounted: (state: State) => state.forceMounted,
  activeIndex: (state: State) => state.activeIndex,
  selectedIndex: (state: State) => state.selectedIndex,
  isActive: (state: State, index: number) => state.activeIndex === index,
  isSelected: (state: State, itemValue: any) => state.selectedValue === itemValue,
  isSelectedByFocus: (state: State, index: number) => state.selectedIndex === index,
  positionerElement: (state: State) => state.positionerElement,
  listElement: (state: State) => state.listElement,
  triggerElement: (state: State) => state.triggerElement,
  inputElement: (state: State) => state.inputElement,
  inputGroupElement: (state: State) => state.inputGroupElement,
  popupSide: (state: State) => state.popupSide,
  openMethod: (state: State) => state.openMethod,
  inputInsidePopup: (state: State) => state.inputInsidePopup,
  inputOwnsFormValue: (state: State) => state.inputOwnsFormValue,
  multiple: (state: State) => state.multiple,
  disabled: (state: State) => state.disabled,
};

type Selectors = typeof selectors;

function defaultState(initial: Partial<State> = {}): State {
  return {
    id: undefined,
    labelId: undefined,
    items: undefined,
    selectedValue: undefined,
    open: false,
    mounted: false,
    transitionStatus: 'unmounted',
    forceMounted: false,
    activeIndex: null,
    selectedIndex: null,
    positionerElement: null,
    listElement: null,
    triggerElement: null,
    inputElement: null,
    inputGroupElement: null,
    popupSide: null,
    openMethod: null,
    inputInsidePopup: false,
    inputOwnsFormValue: true,
    multiple: false,
    disabled: false,
    ...initial,
  };
}

export type ComboboxStore = ReactStore<Readonly<State>, {}, Selectors> & ComboboxMethods;

export interface ComboboxMethods {
  setSelectedValue: (value: any) => void;
  selectItem: (value: any) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  open: () => void;
  close: () => void;
  setActiveIndex: (index: number | null) => void;
  setPositionerElement: (el: HTMLElement | null) => void;
  setListElement: (el: HTMLElement | null) => void;
  setTriggerElement: (el: HTMLElement | null) => void;
  setInputElement: (el: HTMLInputElement | null) => void;
  setInputGroupElement: (el: HTMLDivElement | null) => void;
}

/**
 * Creates the combobox store.
 * actview 简化：无键盘导航/focus 管理/scroll arrows。
 */
export function createComboboxStore(initialState: Partial<State> = {}): ComboboxStore {
  const store = new ReactStore<Readonly<State>, {}, Selectors>(
    defaultState(initialState),
    {},
    selectors,
  );

  const methods: ComboboxMethods = {
    setSelectedValue(value: any) {
      store.setState({...store.state, selectedValue: value} as any);
    },
    selectItem(value: any) {
      store.setState({
        ...store.state,
        selectedValue: value,
        open: false,
        mounted: false,
        activeIndex: null,
      } as any);
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
    setPositionerElement(el: HTMLElement | null) {
      store.setState({...store.state, positionerElement: el} as any);
    },
    setListElement(el: HTMLElement | null) {
      store.setState({...store.state, listElement: el} as any);
    },
    setTriggerElement(el: HTMLElement | null) {
      store.setState({...store.state, triggerElement: el} as any);
    },
    setInputElement(el: HTMLInputElement | null) {
      store.setState({...store.state, inputElement: el} as any);
    },
    setInputGroupElement(el: HTMLDivElement | null) {
      store.setState({...store.state, inputGroupElement: el} as any);
    },
  };

  return Object.assign(store, methods);
}

import type { VNodeChild } from '@actview/jsx';
import { ActviewStore } from '@base-ui/actview-utils/store';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import type { TransitionStatus } from '../internals/useTransitionStatus';
import type { HTMLProps } from '../internals/types';
import type { Side } from '../internals/useAnchorPositioning';
import { defaultItemEquality, compareItemEquality } from '../internals/itemEquality';
import { type Group, hasNullItemLabel, stringifyAsValue } from '../internals/resolveValueLabel';

export type State = {
  id: string | undefined;
  labelId: string | undefined;
  modal: boolean;
  multiple: boolean;

  items:
    | Record<string, VNodeChild>
    | ReadonlyArray<{ label: VNodeChild; value: any }>
    | ReadonlyArray<Group<any>>
    | undefined;
  itemToStringLabel: ((item: any) => string) | undefined;
  itemToStringValue: ((item: any) => string) | undefined;
  isItemEqualToValue: (itemValue: any, selectedValue: any) => boolean;

  value: any;

  open: boolean;
  mounted: boolean;
  forceMount: boolean;
  transitionStatus: TransitionStatus;
  openMethod: InteractionType | null;

  activeIndex: number | null;
  selectedIndex: number | null;

  popupProps: HTMLProps;
  triggerProps: HTMLProps;
  triggerElement: HTMLElement | null;
  positionerElement: HTMLElement | null;
  listElement: HTMLDivElement | null;
  popupSide: Side | null;

  scrollUpArrowVisible: boolean;
  scrollDownArrowVisible: boolean;

  hasScrollArrows: boolean;
};

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
    const { value, multiple, itemToStringValue } = state;
    if (value == null) {
      return false;
    }
    if (multiple && Array.isArray(value)) {
      return value.length > 0;
    }

    return stringifyAsValue(value, itemToStringValue) !== '';
  },

  hasNullItemLabel: (state: State, enabled: boolean) => {
    return enabled ? hasNullItemLabel(state.items) : false;
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
        storeValue.some((selectedItem) => compareItemEquality(itemValue, selectedItem, comparer))
      );
    }

    // The value is the source of truth: a stale `selectedIndex` (e.g. the controlled
    // value changes while the popup is open, where the index sync is deferred) must not
    // keep a previously selected item marked as selected.
    return compareItemEquality(itemValue, storeValue, comparer);
  },
  isSelectedByFocus: (state: State, index: number) => {
    return state.selectedIndex === index;
  },

  popupProps: (state: State) => state.popupProps,
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

/**
 * The data store that backs `Select.Root` and its parts. Unlike the popup-family stores,
 * the select store is a plain `ActviewStore`: the select is a single-trigger component, so
 * it has no trigger registry, payload, or active-trigger ownership. All refs and callbacks
 * (`listRef`, `valuesRef`, `setOpen`, …) live on `SelectRootContext` instead.
 */
export class SelectStore extends ActviewStore<Readonly<State>, Record<string, never>, Selectors> {
  constructor(initialState?: Partial<State>) {
    super(createInitialState(initialState), {}, selectors);
  }
}

export type SelectStoreView = SelectStore;

function createInitialState(initialState?: Partial<State>): State {
  return {
    id: undefined,
    labelId: undefined,
    modal: true,
    multiple: false,

    items: undefined,
    itemToStringLabel: undefined,
    itemToStringValue: undefined,
    isItemEqualToValue: defaultItemEquality,

    value: null,

    open: false,
    mounted: false,
    forceMount: false,
    transitionStatus: undefined,
    openMethod: null,

    activeIndex: null,
    selectedIndex: null,

    popupProps: EMPTY_OBJECT as HTMLProps,
    triggerProps: EMPTY_OBJECT as HTMLProps,
    triggerElement: null,
    positionerElement: null,
    listElement: null,
    popupSide: null,

    scrollUpArrowVisible: false,
    scrollDownArrowVisible: false,

    hasScrollArrows: false,
    ...initialState,
  };
}

import { ActviewStore } from '@base-ui/actview-utils/store';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { NOOP } from '../internals/noop';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import type { TransitionStatus } from '../internals/useTransitionStatus';
import type { HTMLProps, RefObject } from '../internals/types';
import type { Side } from '../internals/useAnchorPositioning';
import { compareItemEquality, defaultItemEquality } from '../internals/itemEquality';
import { hasNullItemLabel } from '../internals/resolveValueLabel';
import type { AriaCombobox } from './root/AriaCombobox';

export type State = {
  id: string | undefined;
  labelId: string | undefined;

  items: readonly any[] | undefined;

  selectedValue: any;

  open: boolean;
  mounted: boolean;
  transitionStatus: TransitionStatus;
  forceMounted: boolean;

  inline: boolean;

  activeIndex: number | null;
  selectedIndex: number | null;

  popupProps: HTMLProps;
  listProps: HTMLProps;
  inputProps: HTMLProps;
  triggerProps: HTMLProps;
  itemProps: HTMLProps;

  positionerElement: HTMLElement | null;
  listElement: HTMLElement | null;
  popupId: string | undefined;
  triggerElement: HTMLElement | null;
  inputElement: HTMLInputElement | null;
  inputGroupElement: HTMLDivElement | null;
  popupSide: Side | null;

  openMethod: InteractionType | null;

  inputInsidePopup: boolean;
  inputOwnsFormValue: boolean;

  selectionMode: 'single' | 'multiple' | 'none';

  listRef: RefObject<Array<HTMLElement | null>>;
  labelsRef: RefObject<Array<string | null>>;
  popupRef: RefObject<HTMLDivElement | null>;
  emptyRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  startDismissRef: RefObject<HTMLSpanElement | null>;
  endDismissRef: RefObject<HTMLSpanElement | null>;
  keyboardActiveRef: RefObject<boolean>;
  chipsContainerRef: RefObject<HTMLDivElement | null>;
  clearRef: RefObject<HTMLButtonElement | null>;
  valuesRef: RefObject<Array<any>>;
  pointerDownItemRef: RefObject<Element | null>;
  selectionEventRef: RefObject<MouseEvent | PointerEvent | KeyboardEvent | null>;

  setOpen: (open: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => void;
  setInputValue: (value: string, eventDetails: AriaCombobox.ChangeEventDetails) => void;
  setSelectedValue: (value: any, eventDetails: AriaCombobox.ChangeEventDetails) => void;
  setIndices: (indices: {
    activeIndex?: number | null | undefined;
    selectedIndex?: number | null | undefined;
    type?: AriaCombobox.HighlightEventReason | undefined;
  }) => void;
  forceMount: () => void;
  handleSelection: (event: MouseEvent | PointerEvent | KeyboardEvent, itemValue: any) => void;
  requestSubmit: () => void;

  name: string | undefined;
  form: string | undefined;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  grid: boolean;
  virtualized: boolean;
  onOpenChangeComplete: (open: boolean) => void;
  openOnInputClick: boolean;
  itemToStringLabel?: ((item: any) => string) | undefined;
  isItemEqualToValue: (itemValue: any, selectedValue: any) => boolean;
  modal: boolean;
  autoHighlight: false | 'always' | 'input-change';
  submitOnItemClick: boolean;
  hasInputValue: boolean;
};

export type ComboboxStore = ActviewStore<Readonly<State>, Record<string, never>, typeof selectors>;

export class ComboboxStoreImpl extends ActviewStore<
  Readonly<State>,
  Record<string, never>,
  typeof selectors
> {
  constructor(initialState?: Partial<State>) {
    super(createInitialState(initialState), {}, selectors);
  }
}

export type ComboboxStoreClass = ComboboxStoreImpl;

function createInitialState(initialState?: Partial<State>): State {
  return {
    id: undefined,
    labelId: undefined,

    items: undefined,

    selectedValue: null,

    open: false,
    mounted: false,
    transitionStatus: undefined,
    forceMounted: false,

    inline: false,

    activeIndex: null,
    selectedIndex: null,

    popupProps: EMPTY_OBJECT as HTMLProps,
    listProps: EMPTY_OBJECT as HTMLProps,
    inputProps: EMPTY_OBJECT as HTMLProps,
    triggerProps: EMPTY_OBJECT as HTMLProps,
    itemProps: EMPTY_OBJECT as HTMLProps,

    positionerElement: null,
    listElement: null,
    popupId: undefined,
    triggerElement: null,
    inputElement: null,
    inputGroupElement: null,
    popupSide: null,

    openMethod: null,

    inputInsidePopup: true,
    inputOwnsFormValue: false,

    selectionMode: 'single',

    listRef: { current: [] as Array<HTMLElement | null> },
    labelsRef: { current: [] as Array<string | null> },
    popupRef: { current: null as HTMLDivElement | null },
    emptyRef: { current: null as HTMLDivElement | null },
    inputRef: { current: null as HTMLInputElement | null },
    startDismissRef: { current: null as HTMLSpanElement | null },
    endDismissRef: { current: null as HTMLSpanElement | null },
    keyboardActiveRef: { current: true },
    chipsContainerRef: { current: null as HTMLDivElement | null },
    clearRef: { current: null as HTMLButtonElement | null },
    valuesRef: { current: [] as Array<any> },
    pointerDownItemRef: { current: null as Element | null },
    selectionEventRef: { current: null as MouseEvent | PointerEvent | KeyboardEvent | null },

    // Placeholder callbacks replaced on first render
    setOpen: NOOP,
    setInputValue: NOOP,
    setSelectedValue: NOOP,
    setIndices: NOOP,
    handleSelection: NOOP,
    forceMount: NOOP,
    requestSubmit: NOOP,

    name: undefined,
    form: undefined,
    disabled: false,
    readOnly: false,
    required: false,
    grid: false,
    virtualized: false,
    onOpenChangeComplete: NOOP,
    openOnInputClick: true,
    itemToStringLabel: undefined,
    isItemEqualToValue: defaultItemEquality,
    modal: false,
    autoHighlight: false,
    submitOnItemClick: false,
    hasInputValue: false,
    ...initialState,
  };
}

export const selectors = {
  id: (state: State) => state.id,
  labelId: (state: State) => state.labelId,

  items: (state: State) => state.items,

  selectedValue: (state: State) => state.selectedValue,
  hasSelectionChips: (state: State) => {
    const selectedValue = state.selectedValue;
    return Array.isArray(selectedValue) && selectedValue.length > 0;
  },

  hasSelectedValue: (state: State) => {
    const { selectedValue, selectionMode } = state;
    if (selectedValue == null) {
      return false;
    }
    if (selectionMode === 'multiple' && Array.isArray(selectedValue)) {
      return selectedValue.length > 0;
    }
    return true;
  },

  hasNullItemLabel: (state: State, enabled: boolean) => {
    return enabled ? hasNullItemLabel(state.items) : false;
  },

  open: (state: State) => state.open,
  mounted: (state: State) => state.mounted,
  forceMounted: (state: State) => state.forceMounted,

  inline: (state: State) => state.inline,

  activeIndex: (state: State) => state.activeIndex,
  selectedIndex: (state: State) => state.selectedIndex,
  isActive: (state: State, index: number) => state.activeIndex === index,
  isSelected: (state: State, itemValue: any) => {
    const comparer = state.isItemEqualToValue;
    const selectedValue = state.selectedValue;
    if (Array.isArray(selectedValue)) {
      return selectedValue.some((selectedItem) =>
        compareItemEquality(itemValue, selectedItem, comparer),
      );
    }
    return compareItemEquality(itemValue, selectedValue, comparer);
  },

  transitionStatus: (state: State) => state.transitionStatus,

  popupProps: (state: State) => state.popupProps,
  listProps: (state: State) => state.listProps,
  inputProps: (state: State) => state.inputProps,
  triggerProps: (state: State) => state.triggerProps,
  itemProps: (state: State) => state.itemProps,

  positionerElement: (state: State) => state.positionerElement,
  listElement: (state: State) => state.listElement,
  popupId: (state: State) => state.popupId,
  triggerElement: (state: State) => state.triggerElement,
  inputElement: (state: State) => state.inputElement,
  inputGroupElement: (state: State) => state.inputGroupElement,
  popupSide: (state: State) => state.popupSide,

  openMethod: (state: State) => state.openMethod,

  inputInsidePopup: (state: State) => state.inputInsidePopup,
  inputOwnsFormValue: (state: State) => state.inputOwnsFormValue,

  selectionMode: (state: State) => state.selectionMode,

  name: (state: State) => state.name,
  form: (state: State) => state.form,
  disabled: (state: State) => state.disabled,
  readOnly: (state: State) => state.readOnly,
  required: (state: State) => state.required,
  grid: (state: State) => state.grid,
  virtualized: (state: State) => state.virtualized,
  itemToStringLabel: (state: State) => state.itemToStringLabel,
  isItemEqualToValue: (state: State) => state.isItemEqualToValue,
  modal: (state: State) => state.modal,
  autoHighlight: (state: State) => state.autoHighlight,
};

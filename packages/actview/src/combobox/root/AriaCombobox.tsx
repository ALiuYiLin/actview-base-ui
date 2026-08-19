import { computed, ref, watch } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { createElement } from '@actview/jsx';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { useOnFirstRender } from '@base-ui/actview-utils/useOnFirstRender';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { getOverflowAncestors } from '@floating-ui/dom';
import {
  ElementProps,
  useDismiss,
  useFloatingRootContext,
  useListNavigation,
  useClick,
} from '../../floating-ui-actview';
import { gridNavigation } from '../../floating-ui-actview/hooks/gridNavigation';
import { contains, getTarget } from '../../floating-ui-actview/utils';
import {
  createChangeEventDetails,
  createGenericEventDetails,
  type BaseUIChangeEventDetails,
  type BaseUIGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  ComboboxFloatingContext,
  ComboboxDerivedItemsContext,
  ComboboxHasItemsContext,
  ComboboxRootContext,
  ComboboxInputValueContext,
} from './ComboboxRootContext';
import { selectors, ComboboxStoreImpl, type State as StoreState } from '../store';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { createCollatorItemFilter, type FilterItemToString } from './utils';
import { useCoreFilter } from './utils/useFilter';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { isScrollableY } from '../../utils/scrollable';
import type { BaseUIEvent, HTMLProps } from '../../internals/types';
import { useValueChanged } from '../../internals/useValueChanged';
import { NOOP } from '../../internals/noop';
import { FOCUSABLE_POPUP_PROPS } from '../../utils/popups';
import { mergeProps } from '../../merge-props';
import {
  stringifyAsLabel,
  stringifyAsValue,
  Group,
  flattenLeafItems,
  isGroupedItems,
} from '../../internals/resolveValueLabel';
import {
  compareItemEquality,
  defaultItemEquality,
  findSelectionIndex,
  isSelectedValueDirty,
  removeItem,
  selectedValueIncludes,
} from '../../internals/itemEquality';
import { INITIAL_LAST_HIGHLIGHT, NO_ACTIVE_VALUE } from './utils/constants';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import {
  findCollectionItem,
  type ComboboxItemCollection,
  type ItemCollection,
} from '../items/itemCollection';
import { useListEmpty } from '../utils/parts';

type InternalAriaComboboxProps<Value, Mode extends SelectionMode, Item = Value> = AriaComboboxProps<
  Value,
  Mode,
  Item
>;

/**
 * @internal
 */
export function AriaCombobox<Value, Mode extends SelectionMode = 'none', Item = Value>(
  componentProps: InternalAriaComboboxProps<Value, Mode, Item>,
) {
  const {
    id: idProp,
    onOpenChangeComplete: onOpenChangeCompleteProp,
    defaultSelectedValue = null,
    selectedValue: selectedValueProp,
    onSelectedValueChange,
    defaultInputValue,
    inputValue: inputValueProp,
    open: openProp,
    defaultOpen = false,
    selectionMode,
    onItemHighlighted: onItemHighlightedProp,
    name: nameProp,
    form,
    disabled: disabledProp = false,
    readOnly = false,
    required = false,
    inputRef: inputRefProp,
    grid = false,
    items: itemsProp,
    filteredItems: filteredItemsProp,
    filter: filterProp,
    openOnInputClick = true,
    autoHighlight = false,
    keepHighlight = false,
    highlightItemOnHover = true,
    loopFocus = true,
    itemToStringLabel: itemToStringLabelProp,
    itemToStringValue,
    isItemEqualToValue = defaultItemEquality,
    virtualized = false,
    inline: inlineProp = false,
    fillInputOnItemPress = true,
    modal = false,
    limit = -1,
    autoComplete = 'list',
    formAutoComplete,
    locale,
    submitOnItemClick = false,
  } = componentProps;

  const formContext = useFormContext();
  const fieldRootContext = useFieldRootContext();
  const direction = useDirection();
  const id = useLabelableId({ id: computed(() => componentProps.id) });
  const collatorFilter = useCoreFilter({ locale });

  // Plain items are arrays; normalized `createItems()` collections are objects.
  const collection = computed(() => {
    const itemsValue = componentProps.items;
    return Array.isArray(itemsValue)
      ? null
      : (itemsValue as unknown as ItemCollection<Item, Value> | undefined);
  });

  const items = computed(() => {
    const collectionValue = collection.value;
    return (collectionValue ? collectionValue.data : componentProps.items) as
      | readonly Item[]
      | readonly Group<Item>[]
      | undefined;
  });
  const itemToValue = computed(() => collection.value?.value);

  // A projected collection's items live in the source domain, not the selection-value domain the
  // store matches against, so they are withheld from the store.
  const storeItems = computed(() => (itemToValue.value ? undefined : items.value));

  const filteredItemsPropValue = computed(() => componentProps.filteredItems);

  // The externally filtered items projected to their selection values, with a lookup back to the
  // source items.
  const externalWindow = computed(() => {
    const filteredItemsValue = filteredItemsPropValue.value;
    if (!filteredItemsValue || !itemToValue.value) {
      return undefined;
    }
    const flat = flattenLeafItems(filteredItemsValue);
    const values = flat.map(itemToValue.value);
    let valueToItem: Map<any, any> | undefined;

    return {
      values,
      findItem(itemValue: any, isEqual: (item: any, value: any) => boolean) {
        if (!valueToItem) {
          valueToItem = new Map();
          for (let i = 0; i < values.length; i += 1) {
            if (!valueToItem.has(values[i])) {
              valueToItem.set(values[i], flat[i]);
            }
          }
        }

        return findCollectionItem(valueToItem, itemValue, isEqual);
      },
    };
  });

  const itemToStringLabel = computed(() => {
    const collectionValue = collection.value;
    if (!collectionValue) {
      return componentProps.itemToStringLabel;
    }
    return (itemValue: Value) => {
      return collectionValue.label(itemValue, isItemEqualToValue, (unresolvedValue: any) => {
        const externalItem = externalWindow.value?.findItem(unresolvedValue, isItemEqualToValue);
        if (externalItem != null) {
          return collectionValue.itemLabel(externalItem);
        }
        return stringifyAsLabel(unresolvedValue, componentProps.itemToStringLabel);
      });
    };
  });

  const filterItemToString = computed<FilterItemToString | undefined>(() => {
    const collectionValue = collection.value;
    if (!collectionValue) {
      return componentProps.itemToStringLabel;
    }

    return Object.assign((item: any) => collectionValue.itemLabel(item), {
      selected: (value: any) => stringifyAsLabel(value, itemToStringLabel.value),
    });
  });

  function stringifyValueLabel(item: any) {
    return stringifyAsLabel(item, itemToStringLabel.value);
  }

  const queryChangedAfterOpen = ref(false);
  const closeQuery = ref<string | null>(null);
  const previousCloseQueryRef = { current: closeQuery.value };

  const listRef = { current: [] as Array<HTMLElement | null> };
  const labelsRef = { current: [] as Array<string | null> };
  const popupRef = { current: null as HTMLDivElement | null };
  const inputRef = { current: null as HTMLInputElement | null };
  const startDismissRef = { current: null as HTMLSpanElement | null };
  const endDismissRef = { current: null as HTMLSpanElement | null };
  const emptyRef = { current: null as HTMLDivElement | null };
  const keyboardActiveRef = { current: true };
  const hadInputClearRef = { current: false };
  const chipsContainerRef = { current: null as HTMLDivElement | null };
  const clearRef = { current: null as HTMLButtonElement | null };
  const selectionEventRef = { current: null as MouseEvent | PointerEvent | KeyboardEvent | null };
  const lastHighlightRef = { current: INITIAL_LAST_HIGHLIGHT };
  const pendingQueryHighlightRef = { current: null as null | {
    hasQuery: boolean;
    selection?: boolean | undefined;
  } };

  /**
   * Contains the currently visible list of item values post-filtering.
   */
  const valuesRef = { current: [] as any[] };
  /**
   * The item element that received the last `pointerdown`, used to detect whether a
   * `mouseup` on an item belongs to a drag-select gesture that started elsewhere.
   */
  const pointerDownItemRef = { current: null as Element | null };

  const disabled = computed(() => fieldRootContext.value.disabled || disabledProp);
  const name = computed(() => fieldRootContext.value.name ?? nameProp);
  const multiple = computed(() => selectionMode === 'multiple');
  const single = computed(() => selectionMode === 'single');
  const hasInputValue = computed(
    () => componentProps.inputValue !== undefined || componentProps.defaultInputValue !== undefined,
  );
  const hasItems = computed(() => componentProps.items !== undefined);
  const hasFilteredItemsProp = computed(() => componentProps.filteredItems !== undefined);

  let autoHighlightMode: false | 'input-change' | 'always';
  if (autoHighlight === 'always') {
    autoHighlightMode = 'always';
  } else {
    autoHighlightMode = autoHighlight ? 'input-change' : false;
  }

  const selectedValue = useControlled<any>({
    controlled: computed(() => componentProps.selectedValue),
    default: computed(() =>
      multiple.value
        ? (componentProps.defaultSelectedValue ?? EMPTY_ARRAY)
        : componentProps.defaultSelectedValue,
    ),
    name: 'Combobox',
    state: 'selectedValue',
  });

  const filter = computed(() => {
    const filterValue = componentProps.filter;
    if (filterValue === null) {
      return () => true;
    }
    if (filterValue !== undefined) {
      return filterValue;
    }
    // `shouldBypassFiltering` already empties the query whenever a single selection's label
    // matches it exactly, so the filter never needs a selection-aware variant here.
    return createCollatorItemFilter(collatorFilter, filterItemToString.value);
  });

  // If neither inputValue nor defaultInputValue are provided, derive it from the
  // selected value for single mode so the input reflects the selection on mount.
  const initialDefaultInputValue = useRefWithInit(() => {
    if (hasInputValue.value) {
      return componentProps.defaultInputValue ?? '';
    }
    if (single.value) {
      return stringifyValueLabel(selectedValue.value);
    }
    return '';
  }).current;

  const inputValue = useControlled({
    controlled: computed(() => componentProps.inputValue),
    default: computed(() => initialDefaultInputValue),
    name: 'Combobox',
    state: 'inputValue',
  });

  const open = useControlled({
    controlled: computed(() => componentProps.open),
    default: computed(() => componentProps.defaultOpen ?? false),
    name: 'Combobox',
    state: 'open',
  });

  const openValue = computed(() => open.value ?? false);
  const inputValueValue = computed(() => inputValue.value ?? '');
  const selectedValueValue = computed(() => selectedValue.value ?? null);

  const isGrouped = computed(() => isGroupedItems(items.value));
  const query = computed(() =>
    !openValue.value && closeQuery.value !== null
      ? closeQuery.value
      : String(inputValueValue.value).trim(),
  );

  const selectedLabelString = computed(() =>
    single.value ? stringifyValueLabel(selectedValueValue.value) : '',
  );

  const shouldBypassFiltering = computed(
    () =>
      single.value &&
      !queryChangedAfterOpen.value &&
      query.value !== '' &&
      selectedLabelString.value.length === query.value.length &&
      collatorFilter.contains(selectedLabelString.value, query.value),
  );

  const filterQuery = computed(() =>
    shouldBypassFiltering.value ? '' : (componentProps.filterQuery ?? query.value),
  );
  const shouldIgnoreExternalFiltering = computed(
    () =>
      hasItems.value &&
      hasFilteredItemsProp.value &&
      shouldBypassFiltering.value &&
      (!collection.value || collection.value.hasValue(selectedValueValue.value, isItemEqualToValue)),
  );

  const flatItems = computed<readonly Item[]>(() =>
    items.value ? flattenLeafItems<Item>(items.value) : EMPTY_ARRAY,
  );

  const filteredItems = computed<Item[] | Group<Item>[]>(() => {
    const filteredItemsValue = filteredItemsPropValue.value;
    if (filteredItemsValue && !shouldIgnoreExternalFiltering.value) {
      return filteredItemsValue as Item[] | Group<Item>[];
    }

    if (!items.value) {
      return EMPTY_ARRAY;
    }

    const itemsValue = items.value;
    const filterValue = filter.value;
    const filterQueryValue = filterQuery.value;
    const itemToStringValue = filterItemToString.value;

    if (isGrouped.value) {
      const groupedItems = itemsValue as readonly Group<Item>[];
      const resultingGroups: Group<Item>[] = [];
      let currentCount = 0;

      for (const group of groupedItems) {
        if (limit > -1 && currentCount >= limit) {
          break;
        }

        const remainingLimit = limit > -1 ? limit - currentCount : Infinity;
        const itemsToTake =
          filterQueryValue === '' ? group.items.slice(0, remainingLimit) : [];

        if (filterQueryValue !== '') {
          for (const item of group.items) {
            if (itemsToTake.length >= remainingLimit) {
              break;
            }
            if (filterValue(item, filterQueryValue, itemToStringValue)) {
              itemsToTake.push(item);
            }
          }
        }

        if (itemsToTake.length > 0) {
          const newGroup = { ...group, items: itemsToTake };
          resultingGroups.push(newGroup);
          currentCount += itemsToTake.length;
        }
      }

      return resultingGroups;
    }

    if (filterQueryValue === '') {
      return limit > -1
        ? flatItems.value.slice(0, limit)
        : (flatItems.value as Item[]);
    }

    const limitedItems: Item[] = [];
    for (const item of flatItems.value) {
      if (limit > -1 && limitedItems.length >= limit) {
        break;
      }
      if (filterValue(item, filterQueryValue, itemToStringValue)) {
        limitedItems.push(item);
      }
    }

    return limitedItems;
  });

  /**
   * The filtered items flattened across groups and projected to their selection values.
   */
  const flatFilteredValues = computed<any[]>(() => {
    if (externalWindow.value && filteredItems.value === filteredItemsPropValue.value) {
      return externalWindow.value.values;
    }
    const flat = flattenLeafItems<Item>(filteredItems.value);
    return itemToValue.value
      ? flat.map((item) => itemToValue.value!(item))
      : (flat as any[]);
  });

  const store = useRefWithInit(() => {
    let initialSelectedIndex: number | null = null;
    if (inlineProp && openValue.value && hasItems.value && selectionMode !== 'none') {
      initialSelectedIndex = findSelectionIndex(
        flatFilteredValues.value,
        selectedValueValue.value,
        isItemEqualToValue,
        multiple.value,
      );
    }

    return new ComboboxStoreImpl({
      id: id.value ?? undefined,
      labelId: undefined,
      selectedValue: selectedValueValue.value,
      open: openValue.value,
      items: storeItems.value,
      selectionMode,
      listRef,
      labelsRef,
      popupRef,
      emptyRef,
      inputRef,
      startDismissRef,
      endDismissRef,
      keyboardActiveRef,
      chipsContainerRef,
      clearRef,
      valuesRef,
      pointerDownItemRef,
      selectionEventRef,
      name: name.value,
      form,
      disabled: disabled.value,
      readOnly,
      required,
      grid,
      virtualized,
      openOnInputClick,
      itemToStringLabel: itemToStringLabel.value,
      isItemEqualToValue,
      modal,
      autoHighlight: autoHighlightMode,
      submitOnItemClick,
      hasInputValue: hasInputValue.value,
      mounted: false,
      forceMounted: false,
      transitionStatus: undefined,
      inline: inlineProp,
      activeIndex: null,
      selectedIndex: initialSelectedIndex,
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
      // Avoid duplicate names in the server HTML. Popup inputs aren't rendered
      // until after hydration, so the hidden input takes over then if needed.
      inputOwnsFormValue: selectionMode === 'none',
      onOpenChangeComplete: NOOP,
    });
  }).current;

  const fieldRawValue = computed(() =>
    selectionMode === 'none' ? inputValueValue.value : selectedValueValue.value,
  );
  const fieldStringValue = computed(() => {
    if (selectionMode === 'none') {
      return fieldRawValue.value;
    }
    if (Array.isArray(selectedValueValue.value)) {
      return selectedValueValue.value.map((value) => stringifyAsValue(value, itemToStringValue));
    }
    return stringifyAsValue(selectedValueValue.value, itemToStringValue);
  });

  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inputGroupElement = store.useState('inputGroupElement');
  const inline = store.useState('inline');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const inputOwnsFormValue = store.useState('inputOwnsFormValue');
  const inputMatchesSelectedValue = computed(
    () => single.value && !inputInsidePopup.value && inputValueValue.value === selectedLabelString.value,
  );

  const triggerRef = useValueAsRef(triggerElement);

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(openValue);
  const { openMethod, triggerProps: interactionTypeProps } = useOpenInteractionType(openValue);

  const getStringifiedValueForForm = () => fieldStringValue.value;

  useRegisterFieldControl(
    inputInsidePopup.value ? triggerRef : inputRef,
    computed(() => id.value ?? undefined),
    fieldRawValue,
    getStringifiedValueForForm,
    computed(() => !disabled.value),
    computed(() => nameProp),
  );

  const forceMount = () => {
    if (items.value) {
      // Ensure typeahead works on a closed list.
      labelsRef.current = flatFilteredValues.value.map(stringifyValueLabel);
    } else {
      store.set('forceMounted', true);
    }
  };

  /**
   * Emits `onItemHighlighted` for the item at `index`, or clears the highlight when `index` is `-1`
   * (a no-op if nothing was highlighted). Keeps `lastHighlightRef` in sync with what was emitted.
   */
  const emitHighlight = (
    value: any,
    index: number,
    type: AriaCombobox.HighlightEventReason,
  ) => {
    if (index === -1) {
      if (lastHighlightRef.current === INITIAL_LAST_HIGHLIGHT) {
        return;
      }
      lastHighlightRef.current = INITIAL_LAST_HIGHLIGHT;
    } else {
      lastHighlightRef.current = { value, index };
    }

    componentProps.onItemHighlighted?.(
      value,
      createGenericEventDetails(type, undefined, { index }),
    );
  };

  const setIndices = (options: {
    activeIndex?: number | null | undefined;
    selectedIndex?: number | null | undefined;
    type?: AriaCombobox.HighlightEventReason | undefined;
  }) => {
    const update = {} as Pick<StoreState, 'activeIndex' | 'selectedIndex'>;

    if (options.activeIndex !== undefined) {
      update.activeIndex = options.activeIndex;
    }

    if (options.selectedIndex !== undefined) {
      update.selectedIndex = options.selectedIndex;
    }

    store.update(update);

    const activeIndexOption = options.activeIndex;
    if (activeIndexOption === undefined) {
      return;
    }

    const type: AriaCombobox.HighlightEventReason = options.type || REASONS.none;

    if (activeIndexOption === null) {
      emitHighlight(undefined, -1, type);
    } else {
      emitHighlight(valuesRef.current[activeIndexOption], activeIndexOption, type);
    }
  };

  const setInputValue = (next: string, eventDetails: AriaCombobox.ChangeEventDetails) => {
    componentProps.onInputValueChange?.(next, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    // A canceled selection clear must not suppress close-completion cleanup.
    hadInputClearRef.current = eventDetails.reason === REASONS.inputClear;

    // If user is typing, ensure we don't auto-highlight on open due to a race
    // with the post-open effect that sets this flag.
    if (eventDetails.reason === REASONS.inputChange) {
      // A controlled popup may ignore a close request. Resuming input proves the popup
      // is remaining open, so release the query captured for an exit animation.
      if (openValue.value && closeQuery.value !== null) {
        closeQuery.value = null;
      }

      const event = eventDetails.event as Event;
      const inputType = (event as InputEvent).inputType;
      // Treat composition commits as typed input; autofill may omit `inputType` or
      // report `insertReplacementText`.
      const isTypedInput =
        event.type === 'compositionend' ||
        (inputType != null && inputType !== '' && inputType !== 'insertReplacementText');
      if (isTypedInput) {
        const hasQuery = next.trim() !== '';
        if (hasQuery) {
          queryChangedAfterOpen.value = true;
        }
        // Defer index updates until after the filtered items have been derived to ensure
        // `onItemHighlighted` receives the latest item.
        pendingQueryHighlightRef.current = { hasQuery };

        // Virtualized lists own their scroller. Reset regular lists directly so a stale
        // composite registry cannot select a reordered item and scrolling cannot escape
        // the popup.
        const list = store.state.listElement;
        if (!store.state.virtualized && list) {
          const popup = popupRef.current;
          for (const ancestor of getOverflowAncestors(list.firstElementChild ?? list)) {
            if (
              !isHTMLElement(ancestor) ||
              (popup ? !contains(popup, ancestor) : ancestor.getAttribute('role') === 'dialog')
            ) {
              break;
            }

            if (isScrollableY(ancestor)) {
              ancestor.scrollTop = 0;
              break;
            }
          }
        }

        if (
          hasQuery &&
          autoHighlightMode &&
          store.state.activeIndex == null &&
          (openValue.value || inlineProp)
        ) {
          store.set('activeIndex', 0);
        }
      }
    } else if (
      eventDetails.reason === REASONS.inputClear &&
      next === '' &&
      store.state.inputInsidePopup
    ) {
      // A programmatic clear of an active query (e.g. after selecting an item with the
      // input inside the popup): restore the highlight to the selected item.
      pendingQueryHighlightRef.current = { hasQuery: false, selection: true };
    }

    inputValue.setValueIfUncontrolled(next);
  };

  const handleInterruptedReopen = (isInputChange: boolean) => {
    // Preserve values supplied with the reopen rather than owned by the interrupted close.
    const clearsPendingInput =
      !isInputChange &&
      inputInsidePopup.value &&
      !inline.value &&
      inputValueValue.value !== '' &&
      (String(inputValueValue.value).trim() === closeQuery.value ||
        inputValueValue.value === selectedLabelString.value);

    // Keep the flag while a visible filter survives so the `items` sync cannot overwrite it.
    if (!isInputChange && (clearsPendingInput || inputValueValue.value === '' || inputMatchesSelectedValue.value)) {
      queryChangedAfterOpen.value = false;
    }

    closeQuery.value = null;

    if (clearsPendingInput) {
      // Cleanup clears omit the selection flag and reopening gesture.
      setInputValue('', createChangeEventDetails(REASONS.inputClear));
    }
  };

  const setOpen = (nextOpen: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => {
    if (openValue.value === nextOpen) {
      return;
    }

    // If the `Empty` component is not used, the positioner or popup should be hidden
    // with CSS. In this case, allow the Escape key to bubble to close a parent popup
    // if there are no items to show.
    if (
      eventDetails.reason === REASONS.escapeKey &&
      hasItems.value &&
      flatFilteredValues.value.length === 0 &&
      !emptyRef.current
    ) {
      eventDetails.allowPropagation();
    }

    componentProps.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (nextOpen && closeQuery.value !== null) {
      // `ComboboxInput` calls `setInputValue` before `setOpen`, so on an input-change reopen
      // `inputValue` is still the pre-keystroke value and the typed filter always survives.
      handleInterruptedReopen(eventDetails.reason === REASONS.inputChange);
    }

    if (!nextOpen && queryChangedAfterOpen.value) {
      if (single.value) {
        if (!inline.value) {
          closeQuery.value = query.value;
        }
        // Avoid a flicker when closing the popup with an empty query.
        if (query.value === '') {
          queryChangedAfterOpen.value = false;
        }
      } else if (multiple.value) {
        if (!inline.value) {
          // Freeze the current query so filtering remains stable while exiting.
          closeQuery.value = query.value;
        }

        if (inputInsidePopup.value) {
          setIndices({ activeIndex: null });
        }

        // Clear the input immediately on close while retaining filtering via closeQuery for exit animations
        // if the input is outside the popup. When the input is inside the popup, defer the clear until
        // unmount so the filtered list doesn't flash to unfiltered during the exit animation.
        if (!inputInsidePopup.value || inline.value) {
          setInputValue(
            '',
            createChangeEventDetails(REASONS.inputClear, eventDetails.event, undefined, {
              isItemPress: eventDetails.reason === REASONS.itemPress,
            }),
          );
        }
      }
    }

    open.setValueIfUncontrolled(nextOpen);

    if (
      !nextOpen &&
      inputInsidePopup.value &&
      (eventDetails.reason === REASONS.focusOut || eventDetails.reason === REASONS.outsidePress)
    ) {
      fieldRootContext.value.setTouched(true);
      fieldRootContext.value.setFocused(false);

      if (fieldRootContext.value.validationMode === 'onBlur') {
        const valueToValidate = selectionMode === 'none' ? inputValueValue.value : selectedValueValue.value;
        void fieldRootContext.value.validation.commit(valueToValidate);
      }
    }
  };

  const setSelectedValue = (
    nextValue: Value | Value[] | null,
    eventDetails: AriaCombobox.ChangeEventDetails,
  ) => {
    // Cast to `any` due to conditional value type (single vs. multiple).
    // The runtime implementation already ensures the correct value shape.
    componentProps.onSelectedValueChange?.(nextValue as any, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    selectedValue.setValueIfUncontrolled(nextValue);

    const shouldFillInput =
      (selectionMode === 'none' && popupRef.current && fillInputOnItemPress) ||
      (single.value && !store.state.inputInsidePopup);

    if (shouldFillInput) {
      setInputValue(
        stringifyValueLabel(nextValue),
        createChangeEventDetails(eventDetails.reason, eventDetails.event),
      );
    }
  };

  const handleSelection = (
    event: MouseEvent | PointerEvent | KeyboardEvent,
    itemValue: any,
  ) => {
    const targetEl = getTarget(event) as HTMLElement | null;
    const overrideEvent = selectionEventRef.current ?? event;
    selectionEventRef.current = null;
    const eventDetails = createChangeEventDetails(REASONS.itemPress, overrideEvent);

    // Let the link handle the click.
    const href = targetEl?.closest('a')?.getAttribute('href');
    if (href) {
      if (href.startsWith('#')) {
        setOpen(false, eventDetails);
      }
      return;
    }

    if (multiple.value) {
      const currentSelectedValue = Array.isArray(selectedValueValue.value)
        ? selectedValueValue.value
        : [];
      const isCurrentlySelected = selectedValueIncludes(
        currentSelectedValue,
        itemValue,
        isItemEqualToValue,
      );
      const nextValue = isCurrentlySelected
        ? removeItem(currentSelectedValue, itemValue, isItemEqualToValue)
        : [...currentSelectedValue, itemValue];

      setSelectedValue(nextValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      const wasFiltering = inputRef.current ? inputRef.current.value.trim() !== '' : false;
      if (!wasFiltering) {
        return;
      }

      if (store.state.inputInsidePopup) {
        setInputValue(
          '',
          createChangeEventDetails(REASONS.inputClear, eventDetails.event, undefined, {
            isItemPress: true,
          }),
        );
      } else {
        setOpen(false, eventDetails);
      }
    } else {
      setSelectedValue(itemValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      setOpen(false, eventDetails);
    }
  };

  const requestSubmit = () => {
    const formElement = fieldRootContext.value.validation.inputRef.current?.form ?? store.state.inputElement?.form;
    if (formElement && typeof formElement.requestSubmit === 'function') {
      formElement.requestSubmit();
    }
  };

  const handleUnmount = () => {
    setMounted(false);
    componentProps.onOpenChangeComplete?.(false);
    queryChangedAfterOpen.value = false;
    closeQuery.value = null;

    if (selectionMode === 'none') {
      setIndices({ activeIndex: null, selectedIndex: null });
    } else {
      setIndices({ activeIndex: null });
    }

    // Multiple selection mode:
    // If the user typed a filter and didn't select in multiple mode, clear the input
    // after close completes to avoid mid-exit flicker and start fresh on next open.
    if (
      multiple.value &&
      inputRef.current &&
      inputRef.current.value !== '' &&
      !hadInputClearRef.current
    ) {
      setInputValue('', createChangeEventDetails(REASONS.inputClear));
    }

    // Single selection mode:
    // - If input is rendered inside the popup, clear it so the next open is blank
    // - If input is outside the popup, sync it to the selected value
    if (single.value) {
      if (store.state.inputInsidePopup) {
        if (inputRef.current && inputRef.current.value !== '') {
          setInputValue('', createChangeEventDetails(REASONS.inputClear));
        }
      } else {
        const stringVal = stringifyValueLabel(selectedValueValue.value);
        if (inputRef.current && inputRef.current.value !== stringVal) {
          // If no selection was made, treat this as clearing the typed filter.
          const reason = stringVal === '' ? REASONS.inputClear : REASONS.none;
          setInputValue(stringVal, createChangeEventDetails(reason));
        }
      }
    }
  };

  // Support composing the Dialog component around an inline combobox.
  // `[role="dialog"]` is more interoperable than using a context, e.g. it can work
  // with third-party modal libraries, though the limitation is that the closest
  // `role=dialog` part must be the animated element.
  const resolvedPopupRef = { current: null as HTMLElement | null };
  watch(
    [inline, positionerElement],
    () => {
      if (inline.value && positionerElement.value) {
        resolvedPopupRef.current = positionerElement.value.closest(
          '[role="dialog"]',
        ) as HTMLElement | null;
      } else {
        resolvedPopupRef.current = popupRef.current;
      }
    },
    { immediate: true },
  );

  useOpenChangeComplete({
    enabled: computed(() => !componentProps.actionsRef),
    open: openValue,
    ref: resolvedPopupRef,
    onComplete() {
      if (!openValue.value) {
        handleUnmount();
      }
    },
  });

  if (componentProps.actionsRef) {
    componentProps.actionsRef.current = { unmount: handleUnmount };
  }

  // Sync selected index (layout-effect equivalent).
  watch(
    [
      openValue,
      closeQuery,
      selectedValueValue,
      computed(() => selectionMode),
      multiple,
      hasItems,
      flatFilteredValues,
      computed(() => isItemEqualToValue),
    ],
    () => {
      const closeQueryReleased =
        previousCloseQueryRef.current !== null && closeQuery.value === null;
      previousCloseQueryRef.current = closeQuery.value;

      // Closing indexes against the frozen filtered list. Reopening releases that query, so its
      // rendered coordinates must be synchronized again even though the popup is already open.
      if (openValue.value && (!closeQueryReleased || !hasItems.value)) {
        return;
      }

      // State-driven (not tied to the internal event path) so controlled closes
      // also clear a pointerdown that never received a matching item mouseup.
      if (!openValue.value) {
        pointerDownItemRef.current = null;
      }

      if (selectionMode === 'none') {
        return;
      }

      // Without `items`, look the selection up in the live registry of mounted item
      // values (the list stays mounted while closed when closed-state features need
      // it — trigger interaction and rendered-label autofill force-mount it). Mounted
      // items re-assert the index themselves when their registration moves; when
      // nothing is mounted the lookup resolves to `null` and each item re-registers
      // the index on the next open.
      // Keep the selected index in the coordinates of the list that is actually rendered.
      const registry: readonly any[] = hasItems.value ? flatFilteredValues.value : valuesRef.current;

      setIndices({
        selectedIndex: findSelectionIndex(
          registry,
          selectedValueValue.value,
          isItemEqualToValue,
          multiple.value,
        ),
      });
    },
    { immediate: true },
  );

  // `valuesRef` sync: when `items` is provided, mirror the flat filtered values.
  watch(
    [items, flatFilteredValues],
    () => {
      if (items.value) {
        valuesRef.current = flatFilteredValues.value;
        listRef.current.length = flatFilteredValues.value.length;
      }
    },
    { immediate: true },
  );

  // Pending query highlight + active index reconciliation (layout-effect equivalent).
  watch(
    [
      activeIndex,
      computed(() => autoHighlightMode),
      hasFilteredItemsProp,
      hasItems,
      flatFilteredValues,
      inline,
      openValue,
      inputValueValue,
    ],
    () => {
      const pendingHighlight = pendingQueryHighlightRef.current;
      if (pendingHighlight) {
        // A directly rendered list remains visible when the popup state is closed, while a
        // kept-mounted Positioner is hidden and should stay inert.
        const listIsNavigable =
          openValue.value ||
          inline.value ||
          store.state.positionerElement?.hidden === false;
        if (pendingHighlight.hasQuery) {
          if (autoHighlightMode && listIsNavigable) {
            store.set('activeIndex', 0);
          }
          pendingQueryHighlightRef.current = null;
        } else if (String(inputValueValue.value).trim() === '') {
          // Only handle the clear once it has committed (a controlled input may reject it),
          // so a restore cannot fire while a query is still active.
          pendingQueryHighlightRef.current = null;
          if (listIsNavigable) {
            const clearedBySelection = pendingHighlight.selection;
            if (
              autoHighlightMode === 'always' &&
              !clearedBySelection &&
              store.state.selectionMode === 'none'
            ) {
              // There is no selection to restore in Autocomplete. Keep the first-item reset
              // synchronous so list navigation sees it before a directly rendered list closes.
              store.set('activeIndex', 0);
            }

            // Items re-mounted by the clear publish their composite indices in a follow-up
            // commit, so the item registries are mid-update here. Defer past React's cascade.
            queueMicrotask(() => {
              if (
                (!store.state.open && !store.state.inline) ||
                (inputRef.current && inputRef.current.value.trim() !== '')
              ) {
                return;
              }

              // Return the highlight to the selected item, the same anchor the popup uses
              // when it first opens.
              const currentSelectedValue = store.state.selectedValue;
              const isMultiple = store.state.selectionMode === 'multiple';
              const lastSelectedValue =
                isMultiple && Array.isArray(currentSelectedValue)
                  ? currentSelectedValue[currentSelectedValue.length - 1]
                  : currentSelectedValue;
              const hasSelection =
                store.state.selectionMode !== 'none' && lastSelectedValue != null;

              if (hasSelection || clearedBySelection) {
                const registry =
                  hasItems.value || hasFilteredItemsProp.value
                    ? flatFilteredValues.value
                    : valuesRef.current;
                // A selection that is no longer in the list drops the highlight rather than
                // leaving it on whichever item now occupies that index.
                store.set(
                  'activeIndex',
                  hasSelection
                    ? findSelectionIndex(
                        registry,
                        currentSelectedValue,
                        store.state.isItemEqualToValue,
                        isMultiple,
                      )
                    : null,
                );
              } else if (autoHighlightMode === 'always') {
                store.set('activeIndex', 0);
              }
            });
          }
        }
      }

      if (!openValue.value && !inline.value) {
        return;
      }

      const shouldUseFlatFilteredValues = hasItems.value || hasFilteredItemsProp.value;
      const candidateItems = shouldUseFlatFilteredValues
        ? flatFilteredValues.value
        : valuesRef.current;
      const storeActiveIndex = store.state.activeIndex;

      if (storeActiveIndex == null) {
        if (autoHighlightMode === 'always' && candidateItems.length > 0) {
          store.set('activeIndex', 0);
          return;
        }
        emitHighlight(undefined, -1, REASONS.none);
        return;
      }

      if (storeActiveIndex >= candidateItems.length) {
        emitHighlight(undefined, -1, REASONS.none);
        store.set('activeIndex', null);
        return;
      }

      const itemValue = candidateItems[storeActiveIndex];
      const previouslyHighlightedItemValue = lastHighlightRef.current.value;
      const isSameItem =
        previouslyHighlightedItemValue !== NO_ACTIVE_VALUE &&
        compareItemEquality(
          itemValue,
          previouslyHighlightedItemValue,
          store.state.isItemEqualToValue,
        );

      if (lastHighlightRef.current.index !== storeActiveIndex || !isSameItem) {
        emitHighlight(itemValue, storeActiveIndex, REASONS.none);
      }
    },
    { immediate: true },
  );

  // Field filled state sync.
  watch(
    [computed(() => selectionMode), inputValueValue, selectedValueValue, multiple],
    () => {
      if (selectionMode === 'none') {
        fieldRootContext.value.setFilled(String(inputValueValue.value) !== '');
        return;
      }
      fieldRootContext.value.setFilled(
        multiple.value
          ? Array.isArray(selectedValueValue.value) && selectedValueValue.value.length > 0
          : selectedValueValue.value != null,
      );
    },
    { immediate: true },
  );

  // Ensures that the active index is not set to 0 when the list is empty.
  // This avoids needing to press ArrowDown twice under certain conditions.
  watch(
    [hasItems, computed(() => autoHighlightMode), computed(() => flatFilteredValues.value.length)],
    () => {
      if (hasItems.value && autoHighlightMode && flatFilteredValues.value.length === 0) {
        setIndices({ activeIndex: null });
      }
    },
    { immediate: true },
  );

  function handleQueryChanged() {
    if (
      openValue.value &&
      query.value !== '' &&
      query.value !== String(initialDefaultInputValue) &&
      !inputMatchesSelectedValue.value
    ) {
      queryChangedAfterOpen.value = true;
    }
  }

  function handleOpenChanged() {
    // A controlled `open` prop can interrupt the close without calling `setOpen`.
    if (openValue.value && closeQuery.value !== null) {
      handleInterruptedReopen(false);
    }
  }

  // These sync triggers can run in the same commit while still seeing the pre-commit `inputValue`.
  let syncedSelectedLabel = false;

  function syncInputToSelectedLabel() {
    if (!syncedSelectedLabel && inputValueValue.value !== selectedLabelString.value) {
      syncedSelectedLabel = true;
      setInputValue(selectedLabelString.value, createChangeEventDetails(REASONS.none));
    }
  }

  function handleSelectedValueChanged() {
    if (selectionMode === 'none') {
      return;
    }

    formContext.value.clearErrors(name.value);
    fieldRootContext.value.setDirty(
      isSelectedValueDirty(
        selectedValueValue.value,
        fieldRootContext.value.validityData.initialValue,
        isItemEqualToValue,
      ),
    );

    fieldRootContext.value.validation.change(selectedValueValue.value);

    if (single.value && !hasInputValue.value && !inputInsidePopup.value) {
      syncInputToSelectedLabel();
    }
  }

  // The label catches accessor changes while the items identity restores the selected label after
  // a one-step input clear followed by a data reload. The shared sync prevents duplicate writes
  // when both change in the same commit.
  function syncInputAfterItemsOrLabelChange() {
    if (
      single.value &&
      !hasInputValue.value &&
      !inputInsidePopup.value &&
      !queryChangedAfterOpen.value
    ) {
      syncInputToSelectedLabel();
    }
  }

  function handleInputValueChanged() {
    if (selectionMode !== 'none') {
      return;
    }

    formContext.value.clearErrors(name.value);
    fieldRootContext.value.setDirty(inputValueValue.value !== fieldRootContext.value.validityData.initialValue);

    fieldRootContext.value.validation.change(inputValueValue.value);
  }

  useValueChanged(query, handleQueryChanged);
  useValueChanged(openValue, handleOpenChanged);
  useValueChanged(selectedValueValue, handleSelectedValueChanged);
  useValueChanged(selectedLabelString, syncInputAfterItemsOrLabelChange);
  useValueChanged(items, syncInputAfterItemsOrLabelChange);
  useValueChanged(inputValueValue, handleInputValueChanged);

  const floatingRootContext = useFloatingRootContext({
    open: computed(() => (inline.value ? true : openValue.value)),
    onOpenChange: setOpen,
  });

  // The floating root store reads plain values for its reference/floating elements, so sync
  // the store-backed refs into it manually (the React version passes them via `elements` on
  // every render; ActView setup runs once — see SelectRoot for the same pattern).
  watch(
    [inputInsidePopup, triggerElement, inputElement, inputGroupElement, positionerElement],
    ([insidePopup, trigger, input, inputGroup, positioner]) => {
      const reference = (insidePopup ? trigger : (inputGroup ?? input)) as Element | null;
      floatingRootContext.update({
        referenceElement: reference,
        domReferenceElement: reference,
        floatingElement: positioner,
      });
    },
    { immediate: true },
  );

  const ariaHasPopup = grid ? 'grid' : 'listbox';

  // An inline list isn't gated on `open`: it renders for as long as it's in the tree, so the
  // combobox is permanently expanded even while the internal open state is `false`.
  const expanded = computed(() => openValue.value || inline.value);
  const ariaExpanded = computed(() => (expanded.value ? 'true' : 'false'));

  const role = computed<ElementProps>(() => {
    const isPlainInput = inputElement.value?.tagName === 'INPUT';
    // During SSR and initial hydration, the input ref is not available yet.
    // Assume an input-like control so combobox ARIA attributes are present.
    const shouldTreatAsInput = inputElement.value == null || isPlainInput;
    // A non-input control only takes on combobox semantics while the list is exposed, which for
    // an inline list is the whole time.
    const shouldApplyAria = shouldTreatAsInput || expanded.value;

    const reference = shouldTreatAsInput
      ? ({
          autoComplete: 'off',
          spellCheck: 'false',
          autoCorrect: 'off',
          autoCapitalize: 'none',
        } as unknown as HTMLProps<HTMLInputElement>)
      : ({} as HTMLProps<HTMLInputElement>);

    if (shouldApplyAria) {
      reference.role = 'combobox';
      reference['aria-expanded'] = ariaExpanded.value;
      reference['aria-haspopup'] = ariaHasPopup;
      reference['aria-controls'] = expanded.value ? listElement.value?.id : undefined;
      reference['aria-autocomplete'] = autoComplete;
    }

    return {
      reference,
      floating: { role: 'presentation' },
    };
  });

  const click = useClick(floatingRootContext, {
    enabled: !readOnly && !disabled.value && openOnInputClick,
    event: 'mousedown-only',
    toggle: false,
    // Apply a small delay for touch to let mobile viewport/keyboard positioning settle.
    // This avoids top-bottom flip flickers if the preferred position is "top" when first tapping.
    touchOpenDelay: inputInsidePopup.value ? 0 : 100,
    reason: REASONS.inputPress,
  });

  const dismiss = useDismiss(floatingRootContext, {
    enabled: !readOnly && !disabled.value && !inline.value,
    outsidePressEvent: {
      mouse: 'sloppy',
      // The visual viewport (affected by the mobile software keyboard) can be
      // somewhat small. The user may want to scroll the screen to see more of
      // the popup.
      touch: 'intentional',
    },
    // Without a popup, let the Escape key bubble the event up to other popups' handlers.
    bubbles: inline.value ? true : undefined,
    outsidePress(event) {
      const target = getTarget(event) as Element | null;
      return (
        !contains(triggerElement.value, target) &&
        !contains(clearRef.current, target) &&
        !contains(chipsContainerRef.current, target) &&
        !contains(inputGroupElement.value, target)
      );
    },
  });

  const listNavigation = useListNavigation(floatingRootContext, {
    enabled: !readOnly && !disabled.value,
    id: id.value ?? undefined,
    listRef,
    // Pass the refs (not snapshots): ActView setup runs once, and useListNavigation's internal
    // watchers need to track active/selected index changes driven from outside (e.g. the
    // auto-highlight in this root) to keep its navigation index in sync.
    activeIndex: activeIndex as unknown as number,
    selectedIndex: selectedIndex as unknown as number,
    virtual: true,
    loopFocus,
    allowEscape: loopFocus && !autoHighlightMode,
    focusItemOnOpen:
      queryChangedAfterOpen.value || (selectionMode === 'none' && !autoHighlightMode)
        ? false
        : 'auto',
    focusItemOnHover: highlightItemOnHover,
    resetOnPointerLeave: !keepHighlight,
    orientation: grid ? 'horizontal' : undefined,
    rtl: direction.value === 'rtl',
    disabledIndices: EMPTY_ARRAY,
    grid: grid ? gridNavigation : undefined,
    onNavigate(nextActiveIndex, event) {
      // Retain the highlight only while actually transitioning out or closed.
      if ((!event && !openValue.value) || transitionStatus.value === 'ending') {
        return;
      }

      if (!event) {
        setIndices({
          activeIndex: nextActiveIndex,
        });
      } else {
        setIndices({
          activeIndex: nextActiveIndex,
          type: keyboardActiveRef.current ? REASONS.keyboard : REASONS.pointer,
        });
      }
    },
  });

  const inputProps = computed(() =>
    mergeProps(
      listNavigation.reference,
      {
        onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
          // In grid mode the navigation hook treats ArrowLeft/ArrowRight as horizontal
          // grid movement. When the input has focus and no item is highlighted the user
          // is still editing the query, so let the input keep its native caret behavior.
          if (
            grid &&
            store.state.activeIndex == null &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
          ) {
            event.preventBaseUIHandler();
          }
        },
      },
      dismiss.reference,
      click.reference,
      role.value.reference,
    ),
  );

  const popupProps = computed(() =>
    mergeProps(FOCUSABLE_POPUP_PROPS, dismiss.floating),
  );

  const listProps = computed(() =>
    mergeProps(listNavigation.floating, role.value.floating),
  );

  const itemProps = computed<HTMLProps>(() => {
    const listNavigationItemProps = listNavigation.item as HTMLProps | undefined;
    if (!listNavigationItemProps) {
      return EMPTY_OBJECT;
    }

    // Combobox keeps focus on the input; item focus would incorrectly sync
    // list navigation state from DOM focus.
    return { ...listNavigationItemProps, onFocus: undefined };
  });

  useOnFirstRender(() => {
    store.update({
      inline: inlineProp,
      popupProps: popupProps.value,
      listProps: listProps.value,
      inputProps: inputProps.value,
      triggerProps: interactionTypeProps,
      itemProps: itemProps.value,
      setOpen,
      setInputValue,
      setSelectedValue,
      setIndices,
      handleSelection,
      forceMount,
      requestSubmit,
      onOpenChangeComplete: onOpenChangeCompleteProp ?? NOOP,
    });
  });

  watch(
    [
      id,
      selectedValueValue,
      openValue,
      mounted,
      transitionStatus,
      storeItems,
      inline,
      popupProps,
      listProps,
      inputProps,
      interactionTypeProps,
      itemProps,
      computed(() => selectionMode),
      name,
      computed(() => form),
      disabled,
      computed(() => readOnly),
      computed(() => required),
      computed(() => grid),
      computed(() => virtualized),
      computed(() => openOnInputClick),
      itemToStringLabel,
      computed(() => modal),
      computed(() => autoHighlightMode),
      computed(() => isItemEqualToValue),
      computed(() => submitOnItemClick),
      hasInputValue,
      inputValueValue,
      computed(() => (selectionMode === 'none' && (inlineProp || !store.state.inputInsidePopup))),
    ],
    () => {
      store.update({
        id: id.value ?? undefined,
        selectedValue: selectedValueValue.value,
        inputValue: inputValueValue.value,
        open: openValue.value,
        mounted: mounted.value,
        transitionStatus: transitionStatus.value,
        items: storeItems.value,
        inline: inline.value,
        popupProps: popupProps.value,
        listProps: listProps.value,
        inputProps: inputProps.value,
        triggerProps: interactionTypeProps,
        openMethod: openMethod.value,
        itemProps: itemProps.value,
        selectionMode,
        name: name.value,
        form,
        disabled: disabled.value,
        readOnly,
        required,
        grid,
        virtualized,
        openOnInputClick,
        itemToStringLabel: itemToStringLabel.value,
        modal,
        autoHighlight: autoHighlightMode,
        isItemEqualToValue,
        submitOnItemClick,
        hasInputValue: hasInputValue.value,
        inputOwnsFormValue:
          selectionMode === 'none' && (inlineProp || !store.state.inputInsidePopup),
      });
    },
    { immediate: true },
  );

  const hiddenInputRef = useMergedRefs(inputRefProp, fieldRootContext.value.validation.inputRef);

  const itemsContextValue = computed<ComboboxDerivedItemsContext>(() => ({
    query: query.value,
    hasItems: hasItems.value,
    filteredItems: filteredItems.value,
    flatFilteredValues: flatFilteredValues.value,
  }));

  const serializedValue = computed(() => {
    if (Array.isArray(fieldRawValue.value)) {
      return '';
    }
    return stringifyAsValue(fieldRawValue.value, itemToStringValue);
  });

  const hasMultipleSelection = computed(
    () => multiple.value && Array.isArray(selectedValueValue.value) && selectedValueValue.value.length > 0,
  );
  const hiddenInputName = computed(() =>
    multiple.value || (selectionMode === 'none' && inputOwnsFormValue.value)
      ? undefined
      : name.value,
  );

  const hiddenInputs = computed(() => {
    if (!multiple.value || !Array.isArray(selectedValueValue.value) || !name.value) {
      return null;
    }

    return selectedValueValue.value.map((value: Value) => {
      const currentSerializedValue = stringifyAsValue(value, itemToStringValue);
      return createElement('input', {
        key: currentSerializedValue,
        type: 'hidden',
        form,
        name: name.value,
        value: currentSerializedValue,
        disabled: disabled.value,
      });
    });
  });

  const getHiddenInputProps = () => {
    const disabledValue = disabled.value;

    return fieldRootContext.value.validation.getValidationProps(disabledValue, {
      onFocus() {
        // Move focus when the hidden input is focused.
        if (inputInsidePopup.value) {
          triggerElement.value?.focus();
          return;
        }

        (inputRef.current || triggerElement.value)?.focus();
      },
      // Handle browser autofill.
      onChange(event: Event) {
        // Workaround for https://github.com/react/react/issues/9023
        if (event.defaultPrevented || disabledValue || readOnly) {
          return;
        }

        const currentTarget = event.currentTarget as HTMLInputElement;
        const nextValue = currentTarget.value;
        const nextValueLower = nextValue.toLowerCase();
        const details = createChangeEventDetails(REASONS.none, event);

        const findSerializedMatchIndex = () =>
          valuesRef.current.findIndex(
            (candidate) =>
              stringifyAsValue(candidate, itemToStringValue).toLowerCase() === nextValueLower ||
              stringifyValueLabel(candidate).toLowerCase() === nextValueLower,
          );

        function handleChange() {
          // Browser autofill only writes a single scalar value.
          if (multiple.value) {
            return;
          }

          if (selectionMode === 'none') {
            setInputValue(nextValue, details);
            return;
          }

          // Preserve the original serialized matching, then fall back to rendered text,
          // which browsers can autofill for primitive values like `value="US">United States`.
          let matchingIndex = findSerializedMatchIndex();

          if (matchingIndex === -1) {
            matchingIndex = valuesRef.current.findIndex((_, index) => {
              const renderedLabel = labelsRef.current[index];
              return renderedLabel != null && renderedLabel.toLowerCase() === nextValueLower;
            });
          }

          const matchingValue =
            matchingIndex === -1 ? undefined : valuesRef.current[matchingIndex];
          if (matchingValue != null) {
            // `setSelectedValue` may be canceled by `onValueChange`; rely on
            // `useValueChanged` to mark the field dirty and run validation only
            // when the value actually changes.
            setSelectedValue?.(matchingValue, details);
          }
        }

        // Only single-selection autofill matches against the registered values/labels.
        // `multiple` ignores autofill and `none` just writes the input value, so avoid the
        // sticky `forceMounted` mount (which never resets) for those modes.
        if (single.value) {
          forceMount();
          if (items.value && findSerializedMatchIndex() === -1) {
            // `forceMount` only refreshes the derived labels for the `items` prop. When
            // serialized matching misses, also mount the list so rendered labels (which can
            // differ from the serialized values) are registered for autofill matching.
            store.set('forceMounted', true);
          }
        }
        queueMicrotask(handleChange);
      },
    });
  };

  const getHiddenInputPropsWithExtras = () => ({
    ...(getHiddenInputProps() as Record<string, any>),
    id: id.value && hiddenInputName.value == null ? `${id.value}-hidden-input` : undefined,
    form,
    name: hiddenInputName.value,
    autoComplete: formAutoComplete,
    disabled: disabled.value,
    required: required && !hasMultipleSelection.value,
    readOnly,
    value: serializedValue.value,
    ref: hiddenInputRef as any,
    style: hiddenInputName.value ? visuallyHiddenInput : visuallyHidden,
    tabIndex: -1,
    'aria-hidden': true,
  });

  return (
    <ComboboxRootContext.Provider value={store}>
      <ComboboxFloatingContext.Provider value={floatingRootContext}>
        <ComboboxHasItemsContext.Provider value={hasItems}>
          <ComboboxDerivedItemsContext.Provider value={itemsContextValue}>
            <ComboboxInputValueContext.Provider value={inputValueValue}>
              {componentProps.children}
              <input {...(getHiddenInputPropsWithExtras() as any)} />
              {hiddenInputs.value}
            </ComboboxInputValueContext.Provider>
          </ComboboxDerivedItemsContext.Provider>
        </ComboboxHasItemsContext.Provider>
      </ComboboxFloatingContext.Provider>
    </ComboboxRootContext.Provider>
  );
}

type SelectionMode = 'single' | 'multiple' | 'none';

type ComboboxItemValueType<ItemValue, Mode extends SelectionMode> = Mode extends 'multiple'
  ? ItemValue[]
  : ItemValue;

interface ComboboxRootProps<ItemValue, Item = ItemValue> {
  children?: VNodeChild;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the internal input.
   * Useful when the combobox is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The id of the component.
   */
  id?: string | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to choose a different option from the popup.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the popup is initially open.
   *
   * To render a controlled popup, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the popup is currently open. Use when controlled.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the popup is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the popup is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the popup opens when clicking the input.
   * @default true
   */
  openOnInputClick?: boolean | undefined;
  /**
   * Whether the first matching item is highlighted automatically.
   * - `false`: do not highlight automatically.
   * - `true`: highlight after the user types and keep the highlight while the query changes.
   * - `'always'`: highlight the first item as soon as the list opens.
   * @default false
   */
  autoHighlight?: boolean | 'always' | undefined;
  /**
   * Whether the highlighted item should be preserved when the pointer leaves the list.
   * @default false
   */
  keepHighlight?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the input when the end of the list is reached while using the arrow keys. The first item can then be reached by pressing <kbd>ArrowDown</kbd> again from the input, or the last item can be reached by pressing <kbd>ArrowUp</kbd> from the input.
   * The input is always included in the focus loop per [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
   * When disabled, focus does not move when on the last element and the user presses <kbd>ArrowDown</kbd>, or when on the first element and the user presses <kbd>ArrowUp</kbd>.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * The input value of the combobox. Use when controlled.
   */
  inputValue?: any;
  /**
   * Callback fired when the input value of the combobox changes.
   */
  onInputValueChange?:
    | ((value: string, eventDetails: AriaCombobox.ChangeEventDetails) => void)
    | undefined;
  /**
   * The uncontrolled input value when initially rendered.
   *
   * To render a controlled input, use the `inputValue` prop instead.
   */
  defaultInputValue?: any;
  /**
   * A ref to imperative actions.
   * - `unmount`: Manually unmounts the combobox.
   * Call this after any externally controlled closing animation finishes.
   */
  actionsRef?: { current?: AriaCombobox.Actions | null } | undefined;
  /**
   * Callback fired when an item is highlighted or unhighlighted.
   * Receives the highlighted item value (or `undefined` if no item is highlighted) and event details with a `reason` property describing why the highlight changed.
   * The `reason` can be:
   * - `'keyboard'`: the highlight changed due to keyboard navigation.
   * - `'pointer'`: the highlight changed due to pointer hovering.
   * - `'none'`: the highlight changed programmatically.
   */
  onItemHighlighted?:
    | ((itemValue: ItemValue | undefined, eventDetails: AriaCombobox.HighlightEventDetails) => void)
    | undefined;
  /**
   * A ref to the hidden input element.
   */
  inputRef?: { current?: HTMLInputElement | null } | undefined;
  /**
   * Whether list items are presented in a grid layout.
   * When enabled, arrow keys navigate across rows and columns inferred from DOM rows.
   * @default false
   */
  grid?: boolean | undefined;
  /**
   * The items to be displayed in the list.
   * Can be a flat array of items, an array of groups with items, or a collection created by
   * the `createItems()` function, which derives each item's selection value and label.
   */
  items?:
    | readonly any[]
    | readonly Group<any>[]
    | ComboboxItemCollection<Item, ItemValue>
    | undefined;
  /**
   * Filtered items to display in the list.
   * When provided, the list will use these items instead of filtering the `items` prop internally.
   * When `items` is also provided, this array must preserve its flat or grouped structure.
   * With a `createItems()` collection, pass source items rather than derived values.
   * Use when you want to control filtering logic externally with the `useFilter()` hook.
   */
  filteredItems?: readonly Item[] | readonly Group<Item>[] | undefined;
  /**
   * Filter function used to match items vs input query.
   * Receives the source item, which is the derived value's item when `items` is a `createItems()`
   * collection, and the item itself otherwise.
   */
  filter?:
    | null
    | ((item: Item, query: string, itemToString?: (item: Item) => string) => boolean)
    | undefined;
  /**
   * INTERNAL: The query used to filter items, overriding the derived input query.
   * Used by `AutocompleteRoot` to keep filtering against the typed query while inline
   * autocompletion temporarily changes the displayed input value.
   */
  filterQuery?: string | undefined;
  /**
   * When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string representation for display in the input.
   * If the shape of the object is `{ value, label }`, the label will be used automatically without needing to specify this prop.
   * With a `createItems()` collection, this receives the derived value, and the collection's
   * `getLabel` takes precedence for values it can resolve.
   */
  itemToStringLabel?: ((itemValue: ItemValue) => string) | undefined;
  /**
   * When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string representation for form submission.
   * If the shape of the object is `{ value, label }`, the value will be used automatically without needing to specify this prop.
   * With a `createItems()` collection, this receives the derived value.
   */
  itemToStringValue?: ((itemValue: ItemValue) => string) | undefined;
  /**
   * Custom comparison logic used to determine if a combobox item value matches the current selected value. Useful when item values are objects without matching referentially.
   * With a `createItems()` collection, both arguments are derived values.
   * Defaults to `Object.is` comparison.
   */
  isItemEqualToValue?: ((itemValue: ItemValue, value: ItemValue) => boolean) | undefined;
  /**
   * Whether the items are being externally virtualized.
   * @default false
   */
  virtualized?: boolean | undefined;
  /**
   * Whether the list is rendered inline without using the component's own popup.
   *
   * Specify `open` unconditionally in conjunction with this prop so the list is considered
   * visible: `<Combobox.Root inline open>`
   *
   * In a `Combobox.Root` > `Dialog.Root` composition, bind the Combobox's `open` and
   * `onOpenChange` props to the `Dialog`'s `open` and `onOpenChange` state instead so the
   * component resets its transient state (filter query, highlighted item, and input value) when
   * the dialog closes.
   * @default false
   */
  inline?: boolean | undefined;
  /**
   * Determines if the popup enters a modal state when open.
   * - `true`: user interaction is limited to the popup: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   * @default false
   */
  modal?: boolean | undefined;
  /**
   * The maximum number of items to display in the list.
   * @default -1
   */
  limit?: number | undefined;
  /**
   * Controls how the component behaves with respect to list filtering and inline autocompletion.
   * - `list` (default): items are dynamically filtered based on the input value. The input value does not change based on the active item.
   * - `both`: items are dynamically filtered based on the input value, which will temporarily change based on the active item (inline autocompletion).
   * - `inline`: items are static (not filtered), and the input value will temporarily change based on the active item (inline autocompletion).
   * - `none`: items are static (not filtered), and the input value will not change based on the active item.
   * @default 'list'
   */
  autoComplete?: 'list' | 'both' | 'inline' | 'none' | undefined;
  /**
   * Provides a hint to the browser for autofill on the hidden input element.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
   */
  formAutoComplete?: string | undefined;
  /**
   * The locale to use for string comparison.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * Whether clicking an item should submit the owning form.
   * @default false
   */
  submitOnItemClick?: boolean | undefined;
  /**
   * INTERNAL: When `selectionMode` is `none`, controls whether selecting an item fills the input.
   */
  fillInputOnItemPress?: boolean | undefined;
}

export interface AriaComboboxState {}

export type AriaComboboxProps<
  Value,
  Mode extends SelectionMode = 'none',
  Item = Value,
> = ComboboxRootProps<Value, Item> & {
  /**
   * How the combobox should remember the selected value.
   * - `single`: Remembers the last selected value.
   * - `multiple`: Remember all selected values.
   * - `none`: Do not remember the selected value.
   */
  selectionMode: Mode;
  /**
   * The selected value of the combobox. Use when controlled.
   */
  selectedValue?: ComboboxItemValueType<Value, Mode> | undefined;
  /**
   * The uncontrolled selected value of the combobox when it's initially rendered.
   *
   * To render a controlled combobox, use the `selectedValue` prop instead.
   */
  defaultSelectedValue?: ComboboxItemValueType<Value, Mode> | null | undefined;
  /**
   * Callback fired when the selected value of the combobox changes.
   */
  onSelectedValueChange?:
    | ((
        value: ComboboxItemValueType<Value, Mode>,
        eventDetails: AriaCombobox.ChangeEventDetails,
      ) => void)
    | undefined;
};

export namespace AriaCombobox {
  export type Props<Value, Mode extends SelectionMode = 'none', Item = Value> = AriaComboboxProps<
    Value,
    Mode,
    Item
  >;
  export type State = AriaComboboxState;

  export interface Actions {
    unmount: () => void;
  }

  export type HighlightEventReason =
    | typeof REASONS.keyboard
    | typeof REASONS.pointer
    | typeof REASONS.none;
  export type HighlightEventDetails = BaseUIGenericEventDetails<
    HighlightEventReason,
    { index: number }
  >;

  export type ChangeEventReason =
    | typeof REASONS.triggerPress
    | typeof REASONS.inputPress
    | typeof REASONS.outsidePress
    | typeof REASONS.itemPress
    | typeof REASONS.closePress
    | typeof REASONS.escapeKey
    | typeof REASONS.listNavigation
    | typeof REASONS.focusOut
    | typeof REASONS.inputChange
    | typeof REASONS.inputClear
    | typeof REASONS.clearPress
    | typeof REASONS.chipRemovePress
    | typeof REASONS.cancelOpen
    | typeof REASONS.none;
  export type ChangeEventDetails = BaseUIChangeEventDetails<ChangeEventReason> & {
    /**
     * When `reason` is `input-clear` in multiple mode, indicates whether an item press caused the
     * clear. Automatic cleanup clears omit this property.
     */
    isItemPress?: boolean | undefined;
  };
}

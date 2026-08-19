import { computed, ref, unref, watch } from 'actview';
import {
  useComboboxRootContext,
  useComboboxHasItemsContext,
  useComboboxDerivedItemsContext,
} from '../root/ComboboxRootContext';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ComboboxItemContext } from './ComboboxItemContext';
import { useButton } from '../../internals/use-button';
import { useComboboxRowContext } from '../row/ComboboxRowContext';
import { compareItemEquality, findItemIndex } from '../../internals/itemEquality';

interface ComboboxItemInnerProps {
  componentProps: ComboboxItem.Props;
  /**
   * Whether the list is externally virtualized. Passed down from the wrapper (which already
   * subscribes to it) so the inner component doesn't re-subscribe to the store.
   */
  virtualized: boolean;
  /**
   * Pre-resolved index for the virtualized fallback (when no `index` prop is provided).
   * `undefined` for the common path, where the index is derived from `index` prop or the
   * composite list registration order. May be a ref so items-prop items track filter changes.
   */
  indexFromFilter: number | { value: number } | undefined;
}

function ComboboxItemInner(props: ComboboxItemInnerProps) {
  const { componentProps, virtualized, indexFromFilter } = props;
  const {
    render: _render,
    className: _className,
    style: _style,
    value: itemValue = null,
    index: indexProp,
    disabled: disabledProp = false,
    nativeButton = false,
    ...elementProps
  } = componentProps;

  const textRef = { current: null as HTMLElement | null };
  const listItem = useCompositeListItem({
    guess: true,
    index: indexProp,
    textRef,
  });

  const store = useComboboxRootContext();
  const isRow = useComboboxRowContext();
  const hasItems = useComboboxHasItemsContext();

  const selectionMode = store.useState('selectionMode');
  const rootDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  const disabled = computed(() => rootDisabled.value || disabledProp);
  const selectable = computed(() => selectionMode.value !== 'none');
  // `indexFromFilter` may be a plain number (virtualized items, resolved once per mount) or a
  // computed ref (items-prop items, where the index must follow filter changes).
  const resolvedIndexFromFilter = computed(() => {
    if (indexFromFilter == null) {
      return undefined;
    }
    return typeof indexFromFilter === 'object' ? indexFromFilter.value : indexFromFilter;
  });
  const index = computed(() => indexProp ?? resolvedIndexFromFilter.value ?? listItem.index.value);
  const hasRegistered = computed(() => index.value !== -1);

  const rootId = store.useState('id');
  // Pass the `index` ref (not its snapshot): the store selector args are unwrapped per
  // selection, so the highlight must track filter-driven index changes.
  const highlighted = store.useState('isActive', index as unknown as number);
  const matchesSelectedValue = store.useState('isSelected', itemValue);
  const itemProps = store.useState('itemProps');

  const itemRef = { current: null as HTMLDivElement | null };
  // Reactive mirror of the mounted element: the registration watch below must re-run once the
  // element actually mounts (its `immediate` run happens in setup, before the ref is assigned),
  // so first-render indices that never change still get registered in `listRef`.
  const itemElement = ref<HTMLDivElement | null>(null);

  const id = computed(() =>
    rootId.value != null && hasRegistered.value ? `${rootId.value}-${index.value}` : undefined,
  );
  const selected = computed(() => matchesSelectedValue.value && selectable.value);

  // Register the DOM element in the list ref for virtualized lists (the composite registry
  // covers non-virtualized ones).
  watch(
    [hasRegistered, computed(() => virtualized), computed(() => indexProp != null), index, itemElement],
    () => {
      const shouldRun = hasRegistered.value && (virtualized || indexProp != null);
      if (!shouldRun) {
        return undefined;
      }

      const list = store.state.listRef.current;
      list[index.value] = itemElement.value;

      return () => {
        delete list[index.value];
      };
    },
    { immediate: true },
  );

  // Register the item value in the visible-values registry (items-prop lists don't need it).
  watch(
    [hasRegistered, hasItems, index, computed(() => itemValue)],
    () => {
      if (!hasRegistered.value || hasItems.value) {
        return undefined;
      }

      const visibleValues = store.state.valuesRef.current;
      visibleValues[index.value] = itemValue;

      return () => {
        delete visibleValues[index.value];
      };
    },
    { immediate: true },
  );

  // Keep the selected index in sync while closed (kept-mounted lists).
  watch(
    [hasRegistered, hasItems, index, computed(() => itemValue), isItemEqualToValue],
    () => {
      if (!hasRegistered.value || hasItems.value) {
        return;
      }

      // Runs while closed as well (the list can stay mounted via `keepMounted` or a
      // force-mount) so the index tracks the item's composite position, keeping features
      // like closed-trigger typeahead in sync when the rendered order changes.
      const selectedValue = store.state.selectedValue;
      const lastSelectedValue = Array.isArray(selectedValue)
        ? selectedValue[selectedValue.length - 1]
        : selectedValue;

      if (compareItemEquality(itemValue, lastSelectedValue, isItemEqualToValue.value)) {
        store.set('selectedIndex', index.value);
      }
    },
    { immediate: true },
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
    composite: true,
  });

  const state = computed<ComboboxItemState>(() => ({
    disabled: disabled.value,
    selected: selected.value,
    highlighted: highlighted.value,
  }));

  function commitSelection(nativeEvent: MouseEvent) {
    function selectItem() {
      store.state.handleSelection(nativeEvent, itemValue);
    }

    if (store.state.submitOnItemClick) {
      selectItem();
      store.state.requestSubmit();
    } else {
      selectItem();
    }
  }

  const defaultProps = (): HTMLProps => ({
    id: id.value,
    role: isRow.value ? 'gridcell' : 'option',
    'aria-selected': selectable.value ? selected.value : undefined,
    // Focusable items steal focus from the input upon mouseup.
    // Warn if the user renders a natively focusable element like `<button>`,
    // as it should be a `<div>` instead.
    tabIndex: undefined,
    onPointerDownCapture(event: PointerEvent) {
      // The compat `mouseup` only fires for the primary pointer, so a non-primary
      // touch must not overwrite the shared ref — a mismatch would make the primary
      // pointer's release read as a drag-select and commit a second time after `click`.
      if (event.isPrimary) {
        store.state.pointerDownItemRef.current = event.currentTarget as Element;
      }
      event.preventDefault();
    },
    onMouseDown(event: MouseEvent) {
      // iOS Safari can emit a synthetic mousedown for touch taps without a preceding
      // pointerdown. Prevent default here too so tapping an item does not blur the input.
      event.preventDefault();
    },
    onClick(event: MouseEvent) {
      if (disabled.value || readOnly.value) {
        return;
      }

      commitSelection(event);
    },
    onMouseUp(event: MouseEvent) {
      const pointerStartedOnItem =
        store.state.pointerDownItemRef.current === event.currentTarget;
      store.state.pointerDownItemRef.current = null;

      if (
        disabled.value ||
        readOnly.value ||
        event.button !== 0 ||
        pointerStartedOnItem ||
        !highlighted.value
      ) {
        return;
      }

      commitSelection(event);
    },
  });

  const getElement = useRenderElement('div', componentProps, {
    ref: [
      buttonRef,
      componentProps.ref,
      listItem.ref,
      itemRef,
      (element: HTMLDivElement | null) => {
        itemElement.value = element;
      },
    ],
    state,
    props: [(prev: any) => ({ ...prev, ...itemProps.value }), defaultProps, elementProps, getButtonProps],
  });

  const contextValue = computed<ComboboxItemContext>(() => ({
    selected: selected.value,
    textRef,
  }));

  return (
    <ComboboxItemContext.Provider value={contextValue}>
      {getElement()}
    </ComboboxItemContext.Provider>
  );
}

/**
 * Resolves the index from the filtered items for the virtualized/items-prop fallback
 * (no `index` prop). ActView setup runs once and keyed diffs don't re-fire ref callbacks, so
 * the items-prop path derives the index from the derived-items context instead of the
 * composite registry.
 */
function ComboboxItemVirtualizedIndex(props: {
  componentProps: ComboboxItem.Props;
}) {
  const { componentProps } = props;

  const store = useComboboxRootContext();
  const isItemEqualToValue = store.useState('isItemEqualToValue');
  const derivedItems = useComboboxDerivedItemsContext();

  const lookupValue = componentProps.value ?? null;
  const indexFromFilter = computed(() =>
    findItemIndex(derivedItems.value.flatFilteredValues, lookupValue, isItemEqualToValue.value),
  );

  return (
    <ComboboxItemInner
      componentProps={componentProps}
      // Register the DOM element in `listRef` (used by `clickHighlightedItem` for keyboard
      // selection). The index ref is reactive, so filtered re-renders re-register correctly.
      virtualized
      indexFromFilter={indexFromFilter}
    />
  );
}

/**
 * An individual item in the list.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxItem(componentProps: ComboboxItem.Props) {
  const store = useComboboxRootContext();
  const virtualized = store.useState('virtualized');
  const hasItems = useComboboxHasItemsContext();

  // `virtualized`/`hasItems` (and whether an item provides an explicit `index`) must be stable
  // for an item's lifetime: the two branches return different component types, so flipping at
  // runtime remounts the item and resets its refs and effects.
  if ((virtualized.value || hasItems.value) && componentProps.index == null) {
    return <ComboboxItemVirtualizedIndex componentProps={componentProps} />;
  }

  return (
    <ComboboxItemInner
      componentProps={componentProps}
      virtualized={virtualized.value}
      indexFromFilter={undefined}
    />
  );
}

export interface ComboboxItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface ComboboxItemProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'div', ComboboxItemState>, 'id'> {
  children?: any;
  /**
   * An optional click handler for the item when selected.
   * It fires when clicking the item with the pointer, as well as when pressing `Enter` with the keyboard if the item is highlighted when the `Input` or `List` element has focus.
   */
  onClick?: BaseUIComponentProps<'div', ComboboxItemState>['onClick'] | undefined;
  /**
   * The index of the item in the list. Improves performance when specified by avoiding the need to calculate the index automatically from the DOM.
   */
  index?: number | undefined;
  /**
   * A unique value that identifies this item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxItem {
  export type State = ComboboxItemState;
  export type Props = ComboboxItemProps;
}

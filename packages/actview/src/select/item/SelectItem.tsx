import { computed, watch } from 'actview';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { useSelectRootContext } from '@/select/root/SelectRootContext';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import type {
  BaseUIComponentProps,
  BaseUIEvent,
  HTMLProps,
  NonNativeButtonProps,
} from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { SelectItemContext } from '@/select/item/SelectItemContext';
import { selectors } from '@/select/store';
import { useButton } from '@/internals/use-button';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { compareItemEquality, removeItem } from '@/internals/itemEquality';
import { isVirtualClick } from '@/floating-ui-actview/utils/event';

/**
 * An individual option in the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItem(componentProps: SelectItem.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    value: itemValue = null,
    label,
    disabled: disabledProp = false,
    nativeButton = false,
    ...elementProps
  } = componentProps;

  const textRef = { current: null as HTMLElement | null };
  const listItem = useCompositeListItem({
    guess: true,
    label,
    textRef,
  });

  const rootContext = useSelectRootContext().value!;
  const {
    store,
    itemProps,
    setOpen,
    setValue,
    selectionRef,
    typingRef,
    valuesRef,
    selectedItemTextRef,
    disabled: selectDisabled,
    readOnly,
  } = rootContext;

  const disabled = computed(() => selectDisabled || disabledProp);
  const highlighted = store.useState('isActive', listItem.index as unknown as number);
  const open = store.useState('open');
  const selected = store.useState('isSelected', itemValue);
  const selectedByFocus = store.useState('isSelectedByFocus', listItem.index as unknown as number);
  const isItemEqualToValue = store.useState('isItemEqualToValue');
  const multiple = store.useState('multiple');

  const index = listItem.index;

  const itemRef = { current: null as HTMLDivElement | null };

  watch(
    [index, () => itemValue],
    () => {
      const values = valuesRef.current;
      values[index.value] = itemValue;

      return () => {
        delete values[index.value];
      };
    },
    { immediate: true },
  );

  watch(
    [index, () => multiple.value, isItemEqualToValue, () => store.state.value, () => itemValue],
    () => {
      const selectedValue = store.state.value;

      let selectedCandidate = selectedValue;
      if (multiple.value && Array.isArray(selectedValue)) {
        // Compare against the last selected item, or `undefined` when nothing is selected — never
        // the raw array, which a custom `isItemEqualToValue` isn't expected to receive.
        selectedCandidate =
          selectedValue.length > 0 ? selectedValue[selectedValue.length - 1] : undefined;
      }

      if (
        selectedCandidate !== undefined &&
        compareItemEquality(itemValue, selectedCandidate, isItemEqualToValue.value)
      ) {
        store.set('selectedIndex', index.value);
        // Make sure SelectPopup can measure the selected item on first open.
        // SelectItemText can still update this ref later when focus moves.
        if (textRef.current) {
          selectedItemTextRef.current = textRef.current;
        }
      }
    },
    { immediate: true },
  );

  const pointerTypeRef = { current: 'mouse' as 'mouse' | 'touch' | 'pen' };
  const allowMouseSelectionRef = { current: false };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
    composite: true,
  });

  const state = computed<SelectItemState>(() => ({
    disabled: disabled.value,
    selected: selected.value,
    highlighted: highlighted.value,
  }));

  function commitSelection(event: MouseEvent | KeyboardEvent | PointerEvent) {
    // A forced-open select (`open`/`defaultOpen`) can still receive item activations even
    // when the root is disabled or read-only, so guard the commit here too.
    if (selectDisabled || readOnly) {
      return;
    }

    const selectedValue = store.state.value;
    if (multiple.value) {
      const currentValue = Array.isArray(selectedValue) ? selectedValue : [];
      const nextValue = selected.value
        ? removeItem(currentValue, itemValue, isItemEqualToValue.value)
        : [...currentValue, itemValue];
      setValue(nextValue, createChangeEventDetails(REASONS.itemPress, event));
    } else {
      setValue(itemValue, createChangeEventDetails(REASONS.itemPress, event));
      setOpen(false, createChangeEventDetails(REASONS.itemPress, event));
    }
  }

  function resetDragMovement() {
    selectionRef.current.dragY = 0;
  }

  const getDefaultProps = (): HTMLProps => ({
    role: 'option',
    'aria-selected': selected.value ? 'true' : 'false',
    tabIndex: open.value && highlighted.value ? 0 : -1,
    onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
      store.set('activeIndex', index.value);

      if (event.key === ' ' && typingRef.current) {
        // `useButton` skips Space activation for `role="option"` items when the keydown
        // is `defaultPrevented`, keeping typeahead spaces from committing a selection.
        event.preventDefault();
      }
    },
    onClick(event: MouseEvent) {
      const isMouseClick = pointerTypeRef.current !== 'touch';
      const clickPointerType = (event as PointerEvent).pointerType;
      const isVirtualMouseClick =
        isMouseClick &&
        isVirtualClick(event) &&
        // Generic no-pointer `detail === 0` clicks stay tied to highlight state. Virtual
        // clicks that carry browser pointer data, including an empty string from assistive
        // technology, can activate unhighlighted items.
        (clickPointerType !== undefined || highlighted.value);
      // With alignItemWithTrigger, opening can place an item under the cursor. Real mouse
      // clicks must start on the item, while virtual clicks represent explicit keyboard or
      // assistive technology activation.
      const isInvalidMouseClick =
        isMouseClick && !isVirtualMouseClick && !allowMouseSelectionRef.current;

      allowMouseSelectionRef.current = false;

      if (disabled.value || isInvalidMouseClick) {
        return;
      }

      commitSelection(event);
    },
    onPointerEnter(event: PointerEvent) {
      pointerTypeRef.current = event.pointerType as 'mouse' | 'touch' | 'pen';
    },
    onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.buttons === 1) {
        const selection = selectionRef.current;
        selection.dragY += event.movementY;

        if (selection.dragY ** 2 >= 64) {
          selection.allowUnselectedMouseUp = true;
        }
      }
    },
    onPointerDown(event: PointerEvent) {
      pointerTypeRef.current = event.pointerType as 'mouse' | 'touch' | 'pen';
      allowMouseSelectionRef.current = true;
      resetDragMovement();
    },
    onMouseUp() {
      resetDragMovement();

      if (disabled.value || pointerTypeRef.current === 'touch') {
        return;
      }

      // Regular clicks are committed by the click event.
      if (allowMouseSelectionRef.current) {
        return;
      }

      const disallowSelectedMouseUp = !selectionRef.current.allowSelectedMouseUp && selected.value;
      const disallowUnselectedMouseUp = !selectionRef.current.allowUnselectedMouseUp && !selected.value;

      if (disallowSelectedMouseUp || disallowUnselectedMouseUp) {
        return;
      }

      allowMouseSelectionRef.current = true;
      itemRef.current?.click();
      allowMouseSelectionRef.current = false;
    },
  });

  const getElement = useRenderElement('div', componentProps, {
    ref: [buttonRef, componentProps.ref, listItem.ref, itemRef],
    state,
    props: [
      itemProps,
      // `itemProps` and `getDefaultProps` carry store-reactive values, so merge them inside
      // getters (setup would snapshot them).
      (prev: any) => ({ ...prev, ...itemProps }),
      (prev: any) => ({ ...prev, ...getDefaultProps() }),
      elementProps,
      getButtonProps,
    ],
  });

  const contextValue = computed<SelectItemContext>(() => ({
    selected: selected.value,
    index: index.value,
    textRef,
    selectedByFocus: selectedByFocus.value,
  }));

  return (
    <SelectItemContext.Provider value={contextValue}>{getElement()}</SelectItemContext.Provider>
  );
}

export interface SelectItemState {
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

export interface SelectItemProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'div', SelectItemState>, 'id'> {
  children?: any;
  /**
   * A unique value that identifies this select item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Specifies the text label to use when the item is matched during keyboard text navigation.
   *
   * Defaults to the item text content if not provided.
   */
  label?: string | undefined;
}

export namespace SelectItem {
  export type State = SelectItemState;
  export type Props = SelectItemProps;
}

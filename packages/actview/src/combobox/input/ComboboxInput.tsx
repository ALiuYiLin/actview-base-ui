import { computed, ref, watch } from 'actview';
import { platform } from '@base-ui/actview-utils/platform';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElement';
import {
  useComboboxInputValueContext,
  useComboboxRootContext,
} from '@/combobox/root/ComboboxRootContext';
import { triggerStateAttributesMapping } from '@/combobox/utils/stateAttributesMapping';
import type { FieldRootState } from '@/field/root/FieldRoot';
import {
  DEFAULT_FIELD_ROOT_CONTEXT,
  FieldRootContext,
  useFieldRootContext,
} from '@/internals/field-root-context/FieldRootContext';
import { DEFAULT_FIELD_STATE_ATTRIBUTES } from '@/internals/field-constants/constants';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useComboboxChipsContext } from '@/combobox/chips/ComboboxChipsContext';
import { stopEvent } from '@/floating-ui-actview/utils';
import { useComboboxPositionerContext } from '@/combobox/positioner/ComboboxPositionerContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { Side } from '@/internals/useAnchorPositioning';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { ComboboxInternalDismissButton } from '@/combobox/utils/ComboboxInternalDismissButton';
import {
  clickHighlightedItem,
  getChipNavigationKeys,
  getIndexAfterChipRemoval,
  useListEmpty,
  usePopupSide,
} from '@/combobox/utils/parts';
import { mergeProps } from '@/merge-props';

/**
 * A text input to search for items in the list.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxInput(componentProps: ComboboxInput.Props) {
  const {
    render: _render,
    className: _className,
    disabled: disabledProp = false,
    id: idProp,
    style: _style,
    ...elementProps
  } = componentProps;

  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();
  const comboboxChipsContext = useComboboxChipsContext();
  const positioning = useComboboxPositionerContext(true);
  const hasPositionerParent = computed(() => positioning.value !== undefined);
  const store = useComboboxRootContext();
  // `inputValue` can't be placed in the store.
  // https://github.com/mui/base-ui/issues/2703
  const inputValue = useComboboxInputValueContext();
  // The rendered string is mirrored into the store so the input re-renders when it
  // changes (e.g. inline autocomplete fills) — context values don't drive re-renders
  // on their own (see QA: combobox-context-render-reactivity).
  const storeInputValue = store.useState('inputValue');
  const direction = useDirection();

  const required = store.useState('required');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const name = store.useState('name');
  const form = store.useState('form');
  const selectionMode = store.useState('selectionMode');
  const autoHighlightMode = store.useState('autoHighlight');
  const inputProps = store.useState('inputProps');
  const triggerProps = store.useState('triggerProps');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const selectedValue = store.useState('selectedValue');
  const rootId = store.useState('id');
  const inline = store.useState('inline');
  const modal = store.useState('modal');

  const autoHighlightEnabled = computed(() => Boolean(autoHighlightMode.value));
  const popupSide = usePopupSide(store);
  const disabled = computed(
    () => fieldRootContext.value.disabled || comboboxDisabled.value || disabledProp,
  );
  const listEmpty = useListEmpty();

  const isInsidePopup = computed(() => hasPositionerParent.value || inline.value);
  const focusManagerModal = computed(() => !isInsidePopup.value || modal.value);
  // `useBaseUiId` must run at setup (it bumps a module-level counter on every call), so the
  // generated id is created once and the computed only picks between it and the root id.
  const generatedInputId = useBaseUiId();
  const id = computed(() =>
    idProp ?? (!isInsidePopup.value ? rootId.value : undefined) ?? generatedInputId,
  );
  const fieldStateForInput = computed(() =>
    hasPositionerParent.value ? DEFAULT_FIELD_STATE_ATTRIBUTES : fieldRootContext.value.state,
  );

  const composingValue = ref<string | null>(null);
  const isComposingRef = { current: false };
  const lastActiveIndexRef = { current: null as number | null };
  const shouldRestoreActiveIndexRef = { current: false };

  const inputOwnsFormValue = computed(() => selectionMode.value === 'none' && !hasPositionerParent.value);

  const setInputElement = (element: HTMLInputElement | null) => {
    const nextIsInsidePopup = hasPositionerParent.value || store.state.inline;

    if (nextIsInsidePopup && !store.state.hasInputValue) {
      store.state.setInputValue('', createChangeEventDetails(REASONS.none));
    }

    store.update({
      inputElement: element,
      inputInsidePopup: nextIsInsidePopup,
      inputOwnsFormValue: inputOwnsFormValue.value,
    });
  };

  const validationProps = computed(() =>
    hasPositionerParent.value
      ? (elementProps as any)
      : fieldRootContext.value.validation.getValidationProps(disabled.value, elementProps as any),
  );

  function clearHighlight() {
    store.state.setIndices({
      activeIndex: null,
      selectedIndex: null,
      type: store.state.keyboardActiveRef.current ? REASONS.keyboard : REASONS.pointer,
    });
  }

  function markPointerActive() {
    store.state.keyboardActiveRef.current = false;
  }

  const state = computed<ComboboxInputState>(() => ({
    ...fieldStateForInput.value,
    open: open.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    popupSide: popupSide.value,
    listEmpty: listEmpty.value,
  }));

  function handleKeyDown(event: KeyboardEvent): number | undefined {
    if (!comboboxChipsContext.value) {
      return undefined;
    }

    let nextIndex: number | undefined;

    const { highlightedChipIndex } = comboboxChipsContext.value;
    const renderedChipsCount = comboboxChipsContext.value.chipsRef.current.length;
    const [previousChipKey, nextChipKey] = getChipNavigationKeys(direction.value);

    if (highlightedChipIndex !== undefined) {
      if (event.key === previousChipKey) {
        event.preventDefault();
        if (highlightedChipIndex > 0) {
          nextIndex = highlightedChipIndex - 1;
        } else {
          nextIndex = undefined;
        }
      } else if (event.key === nextChipKey) {
        event.preventDefault();
        if (highlightedChipIndex < renderedChipsCount - 1) {
          nextIndex = highlightedChipIndex + 1;
        } else {
          nextIndex = undefined;
        }
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        // Move highlight appropriately after removal.
        nextIndex = getIndexAfterChipRemoval(highlightedChipIndex, selectedValue.value.length);
        clearHighlight();
      }
      return nextIndex;
    }

    // Handle navigation when no chip is highlighted
    if (
      event.key === previousChipKey &&
      ((event.currentTarget as HTMLInputElement | null)?.selectionStart ?? 0) === 0 &&
      selectedValue.value.length > 0
    ) {
      event.preventDefault();
      nextIndex = renderedChipsCount > 0 ? renderedChipsCount - 1 : undefined;
    }

    return nextIndex;
  }

  const getElement = useRenderElement('input', componentProps, {
    state,
    ref: [componentProps.ref, store.state.inputRef, setInputElement],
    props: [
      (prev: any) => {
        // Merge (not spread) so `inputProps`'s and `triggerProps`'s handlers (keyboard
        // navigation etc.) chain with the props below (AD-20/AD-27).
        const merged = mergeProps(
          prev,
          inputProps.value,
          triggerProps.value,
          {
            value: composingValue.value ?? storeInputValue.value,
            'aria-readonly': readOnly.value || undefined,
            'aria-required': required.value || undefined,
            'aria-labelledby': labelableContext.value.labelId,
            disabled: disabled.value,
            readOnly: readOnly.value,
            required: selectionMode.value === 'none' ? required.value : undefined,
            form: form.value,
            ...(inputOwnsFormValue.value && name.value ? { name: name.value } : {}),
            id: id.value,
          },
        );
        return merged;
      },
      (prev: any) =>
        mergeProps(
          prev,
          {
            onFocus() {
          fieldRootContext.value.setFocused(true);

          if (!inline.value || !shouldRestoreActiveIndexRef.current) {
            return;
          }

          shouldRestoreActiveIndexRef.current = false;
          const nextActiveIndex = lastActiveIndexRef.current;

          if (
            nextActiveIndex == null ||
            // `valuesRef` can be sparse, so guard against restoring a removed slot.
            !Object.hasOwn(store.state.valuesRef.current, nextActiveIndex)
          ) {
            return;
          }

          store.state.setIndices({ activeIndex: nextActiveIndex });
        },
        onBlur() {
          fieldRootContext.value.setTouched(true);
          fieldRootContext.value.setFocused(false);

          const activeIndex = store.state.activeIndex;
          if (inline.value && activeIndex !== null && autoHighlightMode.value !== 'always') {
            lastActiveIndexRef.current = activeIndex;
            shouldRestoreActiveIndexRef.current = true;
            store.state.setIndices({ activeIndex: null });
          }

          if (fieldRootContext.value.validationMode === 'onBlur') {
            const valueToValidate =
              selectionMode.value === 'none' ? inputValue.value : selectedValue.value;
            fieldRootContext.value.validation.commit(valueToValidate);
          }
        },
        onCompositionStart(event: CompositionEvent) {
          if (platform.os.android) {
            return;
          }
          isComposingRef.current = true;
          composingValue.value = (event.currentTarget as HTMLInputElement).value;
        },
        onCompositionEnd(event: CompositionEvent) {
          isComposingRef.current = false;
          const next = (event.currentTarget as HTMLInputElement).value;
          composingValue.value = null;
          store.state.setInputValue(next, createChangeEventDetails(REASONS.inputChange, event));
        },
        onInput(event: InputEvent) {
          const currentTarget = event.currentTarget as HTMLInputElement;
          const nativeEvent = event;
          // Autofill may not provide `inputType` (Chrome) or may report
          // `insertReplacementText` (Firefox).
          const inputType = (nativeEvent as InputEvent).inputType;
          const autofillLikeInput = !inputType || inputType === 'insertReplacementText';
          // During composition the input is always considered typed into.
          const shouldOpenOnInput = isComposingRef.current || !autofillLikeInput;

          function maybeOpenOnInput(trimmed: string) {
            if (readOnly.value || disabled.value || !trimmed || !shouldOpenOnInput) {
              return;
            }

            store.state.setOpen(true, createChangeEventDetails(REASONS.inputChange, nativeEvent));
            // When autoHighlight is enabled, keep the highlight (will be set to 0 in root).
            if (!autoHighlightEnabled.value) {
              clearHighlight();
            }
          }

          // During IME composition, avoid propagating controlled updates to prevent
          // filtering the options prematurely so `Empty` won't show incorrectly.
          // We can't rely on this check for Android due to how it handles composition
          // events with some keyboards (e.g. Samsung keyboard with predictive text on
          // treats all text as always-composing).
          // https://github.com/mui/base-ui/issues/2942
          if (isComposingRef.current) {
            const nextVal = currentTarget.value;
            composingValue.value = nextVal;

            if (nextVal === '' && !store.state.openOnInputClick && !store.state.inputInsidePopup) {
              store.state.setOpen(false, createChangeEventDetails(REASONS.inputClear, nativeEvent));
            }

            const trimmed = nextVal.trim();
            const shouldMaintainHighlight = autoHighlightEnabled.value && trimmed !== '';

            maybeOpenOnInput(trimmed);

            if (open.value && store.state.activeIndex !== null && !shouldMaintainHighlight) {
              clearHighlight();
            }

            return;
          }

          const inputChangeDetails = createChangeEventDetails(REASONS.inputChange, nativeEvent);
          store.state.setInputValue(currentTarget.value, inputChangeDetails);

          if (inputChangeDetails.isCanceled) {
            return;
          }

          const empty = currentTarget.value === '';
          const clearDetails = createChangeEventDetails(REASONS.inputClear, nativeEvent);

          if (empty && !store.state.inputInsidePopup) {
            if (selectionMode.value === 'single') {
              store.state.setSelectedValue(null, clearDetails);
            }

            if (!store.state.openOnInputClick) {
              store.state.setOpen(false, clearDetails);
            }
          }

          maybeOpenOnInput(currentTarget.value.trim());

          // When the user types, ensure the list resets its highlight so that
          // virtual focus returns to the input (aria-activedescendant is
          // cleared).
          if (open.value && store.state.activeIndex !== null && !autoHighlightEnabled.value) {
            clearHighlight();
          }
        },
        onKeyDown(event: KeyboardEvent) {
          if (disabled.value || readOnly.value) {
            return;
          }

          if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
            return;
          }

          store.state.keyboardActiveRef.current = true;
          const input = event.currentTarget as HTMLInputElement;
          const scrollAmount = input.scrollWidth - input.clientWidth;
          const isRTL = direction.value === 'rtl';

          if (event.key === 'Home') {
            stopEvent(event);
            const cursor = platform.engine.gecko && isRTL ? input.value.length : 0;
            input.setSelectionRange(cursor, cursor);
            input.scrollLeft = 0;
            return;
          }

          if (event.key === 'End') {
            stopEvent(event);
            const cursor = platform.engine.gecko && isRTL ? 0 : input.value.length;
            input.setSelectionRange(cursor, cursor);
            input.scrollLeft = isRTL ? -scrollAmount : scrollAmount;
            return;
          }

          if (!mounted.value && event.key === 'Escape') {
            const isClear =
              selectionMode.value === 'multiple' && Array.isArray(selectedValue.value)
                ? selectedValue.value.length === 0
                : selectedValue.value === null;

            const details = createChangeEventDetails(REASONS.escapeKey, event);
            const value = selectionMode.value === 'multiple' ? [] : null;
            store.state.setInputValue('', details);
            store.state.setSelectedValue(value, details);

            if (!isClear && !store.state.inline && !details.isPropagationAllowed) {
              event.stopPropagation();
            }

            return;
          }

          // Handle deletion when no chip is highlighted and the input is empty.
          if (
            comboboxChipsContext.value &&
            event.key === 'Backspace' &&
            input.value === '' &&
            comboboxChipsContext.value.highlightedChipIndex === undefined &&
            Array.isArray(selectedValue.value) &&
            selectedValue.value.length > 0
          ) {
            const renderedChipsCount = comboboxChipsContext.value.chipsRef.current.length;
            const removalIndex =
              renderedChipsCount > 0
                ? renderedChipsCount - 1
                : selectedValue.value.length - 1;

            const newValue = selectedValue.value.filter(
              (_: any, index: number) => index !== removalIndex,
            );
            // If the removed item was also the active (highlighted) item, clear highlight
            clearHighlight();
            store.state.setSelectedValue(
              newValue,
              createChangeEventDetails(REASONS.none, event),
            );
            return;
          }

          const hadHighlightedChip =
            comboboxChipsContext.value?.highlightedChipIndex !== undefined;
          const nextIndex = handleKeyDown(event);

          comboboxChipsContext.value?.setHighlightedChipIndex(nextIndex);

          if (nextIndex !== undefined) {
            comboboxChipsContext.value?.chipsRef.current[nextIndex]?.focus();
          } else if (hadHighlightedChip) {
            store.state.inputRef.current?.focus();
          }

          // event.isComposing
          if (event.which === 229) {
            return;
          }

          if (event.key === 'Enter' && open.value) {
            const activeIndex = store.state.activeIndex;
            const nativeEvent = event;

            if (activeIndex === null) {
              if (inline.value) {
                return;
              }

              // Allow form submission when no item is highlighted.
              store.state.setOpen(false, createChangeEventDetails(REASONS.none, nativeEvent));
              return;
            }

            stopEvent(event);
            clickHighlightedItem(store, activeIndex, nativeEvent);
          }
        },
        onPointerMove: markPointerActive,
        onPointerDown: markPointerActive,
          },
        ),
      (prev: any) => ({ ...prev, ...validationProps.value }),
    ],
    stateAttributesMapping: triggerStateAttributesMapping,
  });

  return (
    <>
      {open.value && focusManagerModal.value && (
        <ComboboxInternalDismissButton ref={store.state.startDismissRef} />
      )}
      {/* `getElement()` must be invoked inside the render function (not cached in a
          setup const) so reactive props re-evaluate on every render (AD-38). */}
      {hasPositionerParent.value ? (
        <FieldRootContext.Provider value={DEFAULT_FIELD_ROOT_CONTEXT}>
          {getElement()}
        </FieldRootContext.Provider>
      ) : (
        getElement()
      )}
    </>
  );
}

export interface ComboboxInputState extends FieldRootState {
  /**
   * Whether the corresponding popup is open.
   */
  open: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the component should ignore user edits.
   */
  readOnly: boolean;
}

export interface ComboboxInputProps extends BaseUIComponentProps<'input', ComboboxInputState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxInput {
  export type State = ComboboxInputState;
  export type Props = ComboboxInputProps;
}

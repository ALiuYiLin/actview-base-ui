import { computed, watch } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { createElement } from '@actview/jsx';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { usePreviousValue } from '@base-ui/actview-utils/usePreviousValue';
import { isElementDisabled } from '@base-ui/actview-utils/isElementDisabled';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import {
  useClick,
  useDismiss,
  useFloatingRootContext,
  useListNavigation,
  useTypeahead,
} from '../../floating-ui-actview';
import { SelectRootContext } from './SelectRootContext';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { selectors, SelectStore } from '../store';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useFormContext } from '../../internals/form-context/FormContext';
import { stringifyAsLabel, stringifyAsValue } from '../../internals/resolveValueLabel';
import {
  defaultItemEquality,
  findItemIndex,
  isSelectedValueDirty,
} from '../../internals/itemEquality';
import { useValueChanged } from '../../internals/useValueChanged';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { getMaxScrollOffset, normalizeScrollOffset } from '../../utils/scrollEdges';
import { FOCUSABLE_POPUP_PROPS } from '../../utils/popups';
import { mergeProps } from '../../merge-props';

/**
 * Groups all parts of the select.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectRoot<Value, Multiple extends boolean | undefined = false>(
  componentProps: SelectRoot.Props<Value, Multiple>,
) {
  const {
    id: _id,
    name: _name,
    form: _form,
    autoComplete: _autoComplete,
    disabled: _disabled,
    readOnly: _readOnly,
    required: _required,
    modal: _modal,
    actionsRef,
    inputRef,
    onOpenChangeComplete: _onOpenChangeComplete,
    items: _items,
    multiple: _multiple,
    itemToStringLabel: _itemToStringLabel,
    itemToStringValue: _itemToStringValue,
    isItemEqualToValue: _isItemEqualToValue,
    highlightItemOnHover: _highlightItemOnHover,
    children: _children,
  } = componentProps;

  const formContext = useFormContext();
  const fieldRootContext = useFieldRootContext();

  const generatedId = useLabelableId({ id: computed(() => componentProps.id) });
  const rootId = computed(() => generatedId.value ?? undefined);

  const disabled = computed(
    () => fieldRootContext.value.disabled || (componentProps.disabled ?? false),
  );
  const name = computed(() => fieldRootContext.value.name ?? componentProps.name);
  const multiple = computed(() => componentProps.multiple ?? false);
  const modal = computed(() => componentProps.modal ?? true);
  const readOnly = computed(() => componentProps.readOnly ?? false);
  const required = computed(() => componentProps.required ?? false);
  const highlightItemOnHover = computed(() => componentProps.highlightItemOnHover ?? true);
  const itemToStringLabel = computed(() => componentProps.itemToStringLabel);
  const itemToStringValue = computed(() => componentProps.itemToStringValue);
  const isItemEqualToValue = computed(
    () => componentProps.isItemEqualToValue ?? defaultItemEquality,
  );
  const items = computed(() => componentProps.items);

  const value = useControlled({
    controlled: computed(() => componentProps.value),
    default: computed(() =>
      multiple.value ? (componentProps.defaultValue ?? EMPTY_ARRAY) : componentProps.defaultValue,
    ),
    name: 'Select',
    state: 'value',
  });

  const open = useControlled({
    controlled: computed(() => componentProps.open),
    default: computed(() => componentProps.defaultOpen ?? false),
    name: 'Select',
    state: 'open',
  });

  const listRef = { current: [] as Array<HTMLElement | null> };
  const labelsRef = { current: [] as Array<string | null> };
  const popupRef = { current: null as HTMLDivElement | null };
  const scrollHandlerRef = { current: null as ((el: HTMLDivElement) => void) | null };
  const scrollArrowsMountedCountRef = { current: 0 };
  const valueRef = { current: null as HTMLSpanElement | null };
  const valuesRef = { current: [] as any[] };
  const typingRef = { current: false };
  const firstItemTextRef = { current: null as HTMLElement | null };
  const selectedItemTextRef = { current: null as HTMLElement | null };
  const selectionRef = {
    current: {
      allowSelectedMouseUp: false,
      allowUnselectedMouseUp: false,
      dragY: 0,
    },
  };
  const alignItemWithTriggerActiveRef = { current: false };

  const openValue = computed(() => open.value ?? false);

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(openValue);
  const { openMethod, triggerProps: interactionTypeProps } = useOpenInteractionType(openValue);

  const store = useRefWithInit(
    () =>
      new SelectStore({
        id: rootId.value,
        labelId: undefined,
        modal: modal.value,
        multiple: multiple.value,
        itemToStringLabel: itemToStringLabel.value,
        itemToStringValue: itemToStringValue.value,
        isItemEqualToValue: isItemEqualToValue.value,
        value: value.value,
        open: open.value,
        mounted: mounted.value,
        transitionStatus: transitionStatus.value,
        items: items.value,
        forceMount: false,
        openMethod: null,
        activeIndex: null,
        selectedIndex: null,
        popupProps: EMPTY_OBJECT,
        triggerProps: EMPTY_OBJECT,
        triggerElement: null,
        positionerElement: null,
        listElement: null,
        popupSide: null,
        scrollUpArrowVisible: false,
        scrollDownArrowVisible: false,
        hasScrollArrows: false,
      }),
  ).current;

  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const triggerElement = store.useState('triggerElement');
  const positionerElement = store.useState('positionerElement');

  const previousOpenMethod = usePreviousValue(openMethod);
  const renderedOpenMethod = computed(() => openMethod.value ?? previousOpenMethod.value);

  const serializedValue = computed(() => {
    // In multiple mode the shared input is nameless; per-value entries are submitted via
    // `hiddenInputs`. Its value is therefore irrelevant, and passing the whole array to
    // `stringifyAsValue` would invoke a user `itemToStringValue` with an array it doesn't expect.
    if (multiple.value) {
      return '';
    }
    return stringifyAsValue(value.value, itemToStringValue.value);
  });

  const fieldStringValue = computed(() => {
    if (multiple.value && Array.isArray(value.value)) {
      return value.value.map((currentValue) => stringifyAsValue(currentValue, itemToStringValue.value));
    }
    return stringifyAsValue(value.value, itemToStringValue.value);
  });

  const controlRef = useValueAsRef(triggerElement);
  const getStringifiedValueForForm = () => fieldStringValue.value;

  useRegisterFieldControl(
    controlRef,
    rootId,
    value,
    getStringifiedValueForForm,
    computed(() => !disabled.value),
    computed(() => componentProps.name),
  );

  const initialValueRef = { current: value.value };

  // Mirror the `hasSelectedValue` store selector so the Field's filled state agrees with the
  // trigger/value placeholder semantics (a value serializing to `''` counts as empty).
  const hasSelectedValue = computed(() =>
    multiple.value
      ? Array.isArray(value.value) && value.value.length > 0
      : value.value != null && serializedValue.value !== '',
  );

  watch(
    hasSelectedValue,
    (nextHasSelectedValue) => {
      fieldRootContext.value.setFilled(nextHasSelectedValue);
    },
    { immediate: true },
  );

  watch(
    [multiple, () => value.value, () => open.value, isItemEqualToValue],
    () => {
      let target: unknown = value.value;
      let empty = false;

      if (multiple.value) {
        const currentValue = Array.isArray(value.value) ? value.value : [];
        empty = currentValue.length === 0;
        target = currentValue[currentValue.length - 1];
      }

      const index = empty
        ? -1
        : findItemIndex(valuesRef.current, target as Value, isItemEqualToValue.value);
      const nextIndex = index === -1 ? null : index;

      if (nextIndex === null) {
        selectedItemTextRef.current = null;
      }

      if (open.value) {
        return;
      }

      store.set('selectedIndex', nextIndex);
    },
    { immediate: true },
  );

  useValueChanged(value, () => {
    formContext.value.clearErrors(name.value);
    fieldRootContext.value.setDirty(
      isSelectedValueDirty(value.value, fieldRootContext.value.validityData.initialValue, isItemEqualToValue.value),
    );

    fieldRootContext.value.validation.change(value.value);
  });

  const setOpen = (nextOpen: boolean, eventDetails: SelectRoot.ChangeEventDetails) => {
    componentProps.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    open.setValueIfUncontrolled(nextOpen);

    if (
      !nextOpen &&
      (eventDetails.reason === REASONS.focusOut || eventDetails.reason === REASONS.outsidePress)
    ) {
      fieldRootContext.value.setTouched(true);
      fieldRootContext.value.setFocused(false);

      if (fieldRootContext.value.validationMode === 'onBlur') {
        void fieldRootContext.value.validation.commit(value.value);
      }
    }
  };

  const handleUnmount = () => {
    setMounted(false);
    store.update({
      activeIndex: null,
      openMethod: null,
      scrollUpArrowVisible: false,
      scrollDownArrowVisible: false,
    });
    componentProps.onOpenChangeComplete?.(false);
  };

  useOpenChangeComplete({
    enabled: computed(() => !componentProps.actionsRef),
    open: openValue,
    ref: popupRef,
    onComplete() {
      if (!open.value) {
        handleUnmount();
      }
    },
  });

  if (actionsRef) {
    actionsRef.current = { unmount: handleUnmount };
  }

  const setValue = (nextValue: any, eventDetails: SelectRoot.ChangeEventDetails) => {
    componentProps.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    value.setValueIfUncontrolled(nextValue);
  };

  const handleScrollArrowVisibility = (scroller: HTMLElement) => {
    const maxScrollTop = getMaxScrollOffset(scroller.scrollHeight, scroller.clientHeight);
    const scrollTop = normalizeScrollOffset(scroller.scrollTop, maxScrollTop);
    const shouldShowUp = scrollTop > 0;
    const shouldShowDown = scrollTop < maxScrollTop;

    store.set('scrollUpArrowVisible', shouldShowUp);
    store.set('scrollDownArrowVisible', shouldShowDown);
  };

  const floatingContext = useFloatingRootContext({
    open: openValue,
    onOpenChange: setOpen,
  });

  // The floating root store reads plain values for its reference/floating elements, so sync
  // the store-backed refs into it manually (the React version passes them via `elements` on
  // every render; ActView setup runs once).
  watch(
    [triggerElement, positionerElement],
    ([trigger, positioner]) => {
      floatingContext.update({
        referenceElement: trigger,
        domReferenceElement: trigger,
        floatingElement: positioner,
      });
    },
    { immediate: true },
  );

  const click = useClick(floatingContext, {
    enabled: !readOnly.value && !disabled.value,
    event: 'mousedown',
  });

  const dismiss = useDismiss(floatingContext);

  const listNavigation = useListNavigation(floatingContext, {
    enabled: !readOnly.value && !disabled.value,
    listRef,
    activeIndex: activeIndex as unknown as number,
    selectedIndex: selectedIndex as unknown as number,
    disabledIndices: EMPTY_ARRAY,
    onNavigate(nextActiveIndex) {
      // Retain the highlight while transitioning out.
      if (nextActiveIndex === null && !open.value) {
        return;
      }

      store.set('activeIndex', nextActiveIndex);
    },
    focusItemOnHover: highlightItemOnHover.value,
  });

  const typeahead = useTypeahead(floatingContext, {
    enabled: !readOnly.value && !disabled.value,
    listRef: labelsRef,
    activeIndex: activeIndex as unknown as number,
    selectedIndex: selectedIndex as unknown as number,
    // Skip disabled items while matching so typeahead advances to the next selectable item
    // (a click can never select a disabled item and native `<select>` skips them too).
    disabledIndices: (index) => isElementDisabled(listRef.current[index]),
    onMatch(index) {
      if (open.value) {
        store.set('activeIndex', index);
      } else if (!multiple.value) {
        setValue(valuesRef.current[index], createChangeEventDetails(REASONS.none));
      }
    },
    onTyping(typing) {
      typingRef.current = typing;
    },
  });

  // `Select.Trigger` applies the id itself from the store, so it's deliberately not merged here.
  const mergedTriggerProps = mergeProps(
    typeahead.reference,
    listNavigation.reference,
    dismiss.reference,
    click.reference,
    interactionTypeProps,
  );

  const popupProps = mergeProps(
    FOCUSABLE_POPUP_PROPS,
    typeahead.floating,
    listNavigation.floating,
    dismiss.floating,
  );

  const itemProps = listNavigation.item ?? EMPTY_OBJECT;

  store.useSyncedValues({
    id: rootId,
    modal,
    multiple,
    value,
    open: openValue,
    mounted,
    transitionStatus,
    popupProps,
    triggerProps: mergedTriggerProps,
    items,
    itemToStringLabel,
    itemToStringValue,
    isItemEqualToValue,
    openMethod: renderedOpenMethod,
  });

  const contextValue = computed<SelectRootContext>(() => ({
    store,
    floatingContext,
    required: required.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    multiple: multiple.value,
    highlightItemOnHover: highlightItemOnHover.value,
    setValue,
    setOpen,
    listRef,
    popupRef,
    scrollHandlerRef,
    handleScrollArrowVisibility,
    scrollArrowsMountedCountRef,
    itemProps,
    valueRef,
    valuesRef,
    labelsRef,
    typingRef,
    selectionRef,
    firstItemTextRef,
    selectedItemTextRef,
    validation: fieldRootContext.value.validation,
    onOpenChangeComplete: componentProps.onOpenChangeComplete,
    alignItemWithTriggerActiveRef,
    initialValueRef,
  }));

  const ref = useMergedRefs(inputRef, fieldRootContext.value.validation.inputRef);

  const hiddenInputName = multiple.value ? undefined : name.value;

  const hiddenInputs = computed(() => {
    if (!multiple.value || !Array.isArray(value.value) || !name.value) {
      return null;
    }

    return value.value.map((v) => {
      const currentSerializedValue = stringifyAsValue(v, itemToStringValue.value);
      return createElement('input', {
        key: currentSerializedValue,
        type: 'hidden',
        form: componentProps.form,
        name: name.value,
        value: currentSerializedValue,
        disabled: disabled.value,
      });
    });
  });

  const getHiddenInputProps = () => {
    const disabledValue = disabled.value;
    const readOnlyValue = readOnly.value;

    return fieldRootContext.value.validation.getValidationProps(disabledValue, {
      onFocus() {
        // Move focus to the trigger element when the hidden input is focused.
        store.state.triggerElement?.focus({
          focusVisible: true,
        });
      },
      // Handle browser autofill.
      onChange(event: Event) {
        // Workaround for https://github.com/react/react/issues/9023
        if (event.defaultPrevented || disabledValue || readOnlyValue) {
          return;
        }

        const nextValue = (event.currentTarget as HTMLInputElement).value;
        const details = createChangeEventDetails(REASONS.none, event);

        function handleChange() {
          if (multiple.value) {
            // Browser autofill only writes a single scalar value.
            return;
          }

          // Preserve the original serialized matching, then fall back to rendered text,
          // which browsers can autofill for primitive values like `value="US">United States`.
          const nextValueLower = nextValue.toLowerCase();
          let matchingIndex = valuesRef.current.findIndex(
            (candidate) =>
              stringifyAsValue(candidate, itemToStringValue.value).toLowerCase() === nextValueLower ||
              stringifyAsLabel(candidate, itemToStringLabel.value).toLowerCase() === nextValueLower,
          );

          if (matchingIndex === -1) {
            matchingIndex = valuesRef.current.findIndex((_, index) => {
              const renderedLabel = labelsRef.current[index];
              return renderedLabel != null && renderedLabel.toLowerCase() === nextValueLower;
            });
          }

          const matchingValue = valuesRef.current[matchingIndex];
          if (matchingValue != null) {
            // `setValue` may be canceled by `onValueChange`; rely on `useValueChanged` to
            // mark the field dirty and run validation only when the value actually changes.
            setValue(matchingValue, details);
          }
        }

        store.set('forceMount', true);
        queueMicrotask(handleChange);
      },
    });
  };

  const getHiddenInputPropsWithExtras = () => ({
    ...(getHiddenInputProps() as Record<string, any>),
    id: generatedId.value && hiddenInputName == null ? `${generatedId.value}-hidden-input` : undefined,
    form: componentProps.form,
    name: hiddenInputName,
    autoComplete: componentProps.autoComplete,
    value: serializedValue.value,
    disabled: disabled.value,
    required: required.value && !(multiple.value && hasSelectedValue.value),
    readOnly: readOnly.value,
    ref: ref as any,
    style: name.value ? visuallyHiddenInput : visuallyHidden,
    tabIndex: -1,
    'aria-hidden': true,
  }) as JSX.IntrinsicElements['input'] & { form?: string };

  return (
    <SelectRootContext.Provider value={contextValue}>
      {componentProps.children}
      <input {...getHiddenInputPropsWithExtras()} />
      {hiddenInputs.value}
    </SelectRootContext.Provider>
  );
}

type SelectValueType<Value, Multiple extends boolean | undefined> = Multiple extends true
  ? Value[]
  : Value;

export interface SelectRootProps<Value, Multiple extends boolean | undefined = false> {
  children?: VNodeChild;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?:
    | { current?: HTMLInputElement | null; value?: HTMLInputElement | null }
    | ((node: HTMLInputElement | null) => void)
    | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the select is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Provides a hint to the browser for autofill.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
   */
  autoComplete?: string | undefined;
  /**
   * The id of the Select.
   */
  id?: string | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to choose a different option from the select popup.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether multiple items can be selected.
   * @default false
   */
  multiple?: Multiple | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Whether the select popup is initially open.
   *
   * To render a controlled select popup, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the select popup is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: SelectRootChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the select popup is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the select popup is currently open.
   */
  open?: boolean | undefined;
  /**
   * Determines if the select enters a modal state when open.
   * - `true`: user interaction is limited to the select: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Manually unmounts the select.
   * Call this after any externally controlled closing animation finishes.
   */
  actionsRef?: { current?: SelectRootActions | null; value?: SelectRootActions | null } | undefined;
  /**
   * Data structure of the items rendered in the select popup.
   * When specified, `<Select.Value>` renders the label of the selected item instead of the raw value.
   */
  items?:
    | Record<string, VNodeChild>
    | ReadonlyArray<{ label: VNodeChild; value: any }>
    | ReadonlyArray<{ items: ReadonlyArray<{ label: VNodeChild; value: any }> }>
    | undefined;
  /**
   * When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string representation for display in the trigger.
   * If the shape of the object is `{ value, label }`, the label will be used automatically without needing to specify this prop.
   */
  itemToStringLabel?: ((itemValue: Value) => string) | undefined;
  /**
   * When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string representation for form submission.
   * If the shape of the object is `{ value, label }`, the value will be used automatically without needing to specify this prop.
   */
  itemToStringValue?: ((itemValue: Value) => string) | undefined;
  /**
   * Custom comparison logic used to determine if a select item value matches the current selected value. Useful when item values are objects without matching referentially.
   * Defaults to `Object.is` comparison.
   */
  isItemEqualToValue?: ((itemValue: Value, value: Value) => boolean) | undefined;
  /**
   * The uncontrolled value of the select when it's initially rendered.
   *
   * To render a controlled select, use the `value` prop instead.
   */
  defaultValue?: SelectValueType<Value, Multiple> | null | undefined;
  /**
   * The value of the select. Use when controlled.
   */
  value?: SelectValueType<Value, Multiple> | null | undefined;
  /**
   * Event handler called when the value of the select changes.
   */
  onValueChange?:
    | ((
        value: SelectValueType<Value, Multiple> | (Multiple extends true ? never : null),
        eventDetails: SelectRootChangeEventDetails,
      ) => void)
    | undefined;
}

export interface SelectRootState {}

export interface SelectRootActions {
  unmount: () => void;
}

export type SelectRootChangeEventReason =
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.windowResize
  | typeof REASONS.itemPress
  | typeof REASONS.focusOut
  | typeof REASONS.listNavigation
  | typeof REASONS.cancelOpen
  | typeof REASONS.none;

export type SelectRootChangeEventDetails = BaseUIChangeEventDetails<SelectRootChangeEventReason>;

export namespace SelectRoot {
  export type Props<Value, Multiple extends boolean | undefined = false> = SelectRootProps<
    Value,
    Multiple
  >;
  export type State = SelectRootState;
  export type Actions = SelectRootActions;
  export type ChangeEventReason = SelectRootChangeEventReason;
  export type ChangeEventDetails = SelectRootChangeEventDetails;
}

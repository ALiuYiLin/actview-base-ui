import { computed, watch } from 'actview';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useButton } from '@/internals/use-button';
import {
  useComboboxFloatingContext,
  useComboboxInputValueContext,
  useComboboxRootContext,
} from '@/combobox/root/ComboboxRootContext';
import { triggerStateAttributesMapping } from '@/combobox/utils/stateAttributesMapping';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { stopEvent, contains, getTarget } from '@/floating-ui-actview/utils';
import { isMouseWithinBounds } from '@/utils/getPseudoElementBounds';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useClick, useTypeahead } from '@/floating-ui-actview';
import type { Side } from '@/internals/useAnchorPositioning';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { resolveAriaLabelledBy } from '@/utils/resolveAriaLabelledBy';
import { getComboboxPopupId } from '@/combobox/root/utils';
import { useListEmpty, usePopupSide } from '@/combobox/utils/parts';
import { mergeProps } from '@/merge-props';

/**
 * A button that opens the popup.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxTrigger(componentProps: ComboboxTrigger.Props) {
  const {
    render: _render,
    className: _className,
    nativeButton = true,
    disabled: disabledProp = false,
    id: idProp,
    style: _style,
    ...elementProps
  } = componentProps;

  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();
  const store = useComboboxRootContext();

  const selectionMode = store.useState('selectionMode');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const required = store.useState('required');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const storedPopupId = store.useState('popupId');
  const triggerProps = store.useState('triggerProps');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const rootId = store.useState('id');
  const comboboxLabelId = store.useState('labelId');
  const open = store.useState('open');
  const selectedValue = store.useState('selectedValue');
  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const floatingRootContext = useComboboxFloatingContext();
  const inputValue = useComboboxInputValueContext();

  const focusTimeout = useTimeout();

  const disabled = computed(
    () => fieldRootContext.value.disabled || comboboxDisabled.value || disabledProp,
  );
  const listEmpty = useListEmpty();
  const popupSide = usePopupSide(store);

  useLabelableId({ id: computed(() => (inputInsidePopup.value ? idProp : undefined)) });
  const id = computed(() => (inputInsidePopup.value ? (idProp ?? rootId.value) : idProp));
  const ariaLabelledBy = computed(() =>
    resolveAriaLabelledBy(labelableContext.value.labelId, comboboxLabelId.value),
  );

  const ariaControls = computed<string | undefined>(() => {
    if (open.value && inputInsidePopup.value) {
      // Fall back to the default id while the popup registers its own (custom ids are stored once the
      // popup mounts), so `aria-controls` is set on the same commit `open` becomes `true`.
      return storedPopupId.value ?? getComboboxPopupId(rootId.value);
    } else if (open.value) {
      return listElement.value?.id;
    }
    return undefined;
  });

  const currentPointerTypeRef = { current: '' as PointerEvent['pointerType'] };

  function trackPointerType(event: PointerEvent) {
    currentPointerTypeRef.current = event.pointerType;
  }

  const { reference: triggerTypeaheadProps } = useTypeahead(floatingRootContext, {
    enabled:
      !open.value && !readOnly.value && !comboboxDisabled.value && selectionMode.value === 'single',
    listRef: store.state.labelsRef,
    activeIndex: activeIndex.value,
    selectedIndex: selectedIndex.value,
    onMatch(index) {
      const nextSelectedValue = store.state.valuesRef.current[index];
      if (nextSelectedValue !== undefined) {
        store.state.setSelectedValue(nextSelectedValue, createChangeEventDetails(REASONS.none));
      }
    },
  });

  const { reference: triggerClickProps } = useClick(floatingRootContext, {
    enabled: !readOnly.value && !comboboxDisabled.value,
    event: 'mousedown',
  });

  const { buttonRef, getButtonProps } = useButton({
    native: nativeButton,
    disabled,
  });

  const state = computed<ComboboxTriggerState>(() => ({
    ...fieldRootContext.value.state,
    open: open.value,
    disabled: disabled.value,
    popupSide: popupSide.value,
    listEmpty: listEmpty.value,
    placeholder: selectionMode.value === 'none' ? false : !hasSelectedValue.value,
  }));

  const setTriggerElement = store.useStateSetter('triggerElement');

  const getDefaultProps = (): HTMLProps => {
    return {
      id: id.value,
      tabIndex: inputInsidePopup.value ? 0 : -1,
      role: inputInsidePopup.value ? 'combobox' : undefined,
      'aria-expanded': open.value,
      'aria-haspopup': inputInsidePopup.value ? 'dialog' : 'listbox',
      'aria-controls': ariaControls.value,
      'aria-required': inputInsidePopup.value ? required.value || undefined : undefined,
      'aria-labelledby': ariaLabelledBy.value,
      onPointerDown: trackPointerType,
      onPointerEnter: trackPointerType,
      onFocus() {
        fieldRootContext.value.setFocused(true);

        if (disabled.value || readOnly.value) {
          return;
        }

        focusTimeout.start(0, store.state.forceMount);
      },
      onBlur(event: FocusEvent) {
        // If focus is moving into the popup, don't count it as a blur.
        if (contains(positionerElement.value, event.relatedTarget as Element | null)) {
          return;
        }

        fieldRootContext.value.setTouched(true);
        fieldRootContext.value.setFocused(false);

        if (fieldRootContext.value.validationMode === 'onBlur') {
          const valueToValidate =
            selectionMode.value === 'none' ? inputValue.value : selectedValue.value;
          fieldRootContext.value.validation.commit(valueToValidate);
        }
      },
      onMouseDown(event: MouseEvent) {
        if (disabled.value || readOnly.value) {
          return;
        }

        if (!inputInsidePopup.value) {
          floatingRootContext.set('domReferenceElement', event.currentTarget as HTMLElement);
        }

        // Ensure items are registered for initial selection highlight.
        store.state.forceMount();

        if (currentPointerTypeRef.current !== 'touch') {
          store.state.inputRef.current?.focus();

          if (!inputInsidePopup.value) {
            event.preventDefault();
          }
        }

        if (open.value) {
          return;
        }

        const doc = ownerDocument(event.currentTarget as HTMLElement);

        function handleMouseUp(mouseEvent: MouseEvent) {
          const currentTriggerElement = store.state.triggerElement;
          if (!currentTriggerElement) {
            return;
          }

          const mouseUpTarget = getTarget(mouseEvent) as Element | null;
          const positioner = store.state.positionerElement;
          const list = store.state.listElement;

          if (
            contains(currentTriggerElement, mouseUpTarget) ||
            contains(positioner, mouseUpTarget) ||
            contains(list, mouseUpTarget)
          ) {
            return;
          }

          if (isMouseWithinBounds(mouseEvent, currentTriggerElement)) {
            return;
          }

          store.state.setOpen(false, createChangeEventDetails(REASONS.cancelOpen, mouseEvent));
        }

        if (inputInsidePopup.value) {
          doc.addEventListener('mouseup', handleMouseUp, { once: true });
        }
      },
      onKeyDown(event: KeyboardEvent) {
        if (readOnly.value) {
          return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          stopEvent(event);
          store.state.setOpen(
            true,
            createChangeEventDetails(REASONS.listNavigation, event),
          );
          store.state.inputRef.current?.focus();
        }
      },
    };
  };

  // Getters must chain event handlers via `mergeProps`, otherwise the spread would overwrite
  // handlers from earlier props (AD-20/AD-27).
  const getMergedProps = (prev: any): HTMLProps => {
    const merged: HTMLProps = mergeProps<'button'>(
      mergeProps(triggerProps.value, triggerClickProps, triggerTypeaheadProps),
      getDefaultProps(),
      elementProps,
      getButtonProps,
    );
    const props = fieldRootContext.value.validation.getValidationProps(disabled.value, merged);
    return props;
  };

  const getElement = useRenderElement('button', componentProps, {
    ref: [componentProps.ref, buttonRef, setTriggerElement],
    state,
    stateAttributesMapping: triggerStateAttributesMapping,
    props: [getMergedProps],
  });

  return <>{getElement()}</>;
}

export interface ComboboxTriggerState extends FieldRootState {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the combobox doesn't have a value.
   */
  placeholder: boolean;
}

export interface ComboboxTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxTriggerState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxTrigger {
  export type State = ComboboxTriggerState;
  export type Props = ComboboxTriggerProps;
}

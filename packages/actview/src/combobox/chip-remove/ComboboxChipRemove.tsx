import { computed } from 'actview';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useComboboxChipContext } from '../chip/ComboboxChipContext';
import { useButton } from '../../internals/use-button';
import { stopEvent } from '../../floating-ui-actview/utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { findItemIndex } from '../../internals/itemEquality';

/**
 * A button to remove a chip.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxChipRemove(componentProps: ComboboxChipRemove.Props) {
  const {
    render: _render,
    className: _className,
    disabled: disabledProp = false,
    nativeButton = true,
    style: _style,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();
  const { index } = useComboboxChipContext().value;

  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const selectedValue = store.useState('selectedValue');
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  const disabled = computed(() => comboboxDisabled.value || disabledProp);

  const { buttonRef, getButtonProps } = useButton({
    native: nativeButton,
    disabled: computed(() => disabled.value || readOnly.value),
    focusableWhenDisabled: true,
  });

  const state = computed<ComboboxChipRemoveState>(() => ({
    disabled: disabled.value,
  }));

  function clearActiveIndexForRemovedItem(removedItem: any) {
    const activeIndex = store.state.activeIndex;

    if (activeIndex == null) {
      return;
    }

    // Try current visible list first; if not found, it's filtered out.
    // No need to clear highlight in that case since it can't equal activeIndex.
    const removedIndex = findItemIndex(
      store.state.valuesRef.current,
      removedItem,
      isItemEqualToValue.value,
    );
    if (removedIndex !== -1 && activeIndex === removedIndex) {
      store.state.setIndices({
        activeIndex: null,
        type: store.state.keyboardActiveRef.current ? REASONS.keyboard : REASONS.pointer,
      });
    }
  }

  function removeChip(event: MouseEvent | KeyboardEvent) {
    const eventDetails = createChangeEventDetails(REASONS.chipRemovePress, event);
    const removedItem = selectedValue.value[index];

    clearActiveIndexForRemovedItem(removedItem);

    store.state.setSelectedValue(
      selectedValue.value.filter((_: any, i: number) => i !== index),
      eventDetails,
    );

    store.state.inputRef.current?.focus();
    return eventDetails;
  }

  const getElement = useRenderElement('button', componentProps, {
    ref: [componentProps.ref, buttonRef],
    state,
    props: [
      {
        tabIndex: -1,
        onMouseDown(event: MouseEvent) {
          event.preventDefault();
        },
        onClick(event: MouseEvent) {
          const eventDetails = removeChip(event);
          if (!eventDetails.isPropagationAllowed) {
            event.stopPropagation();
          }
        },
        onKeyDown(event: KeyboardEvent) {
          if (event.key === 'Enter' || event.key === ' ') {
            const eventDetails = removeChip(event);
            if (!eventDetails.isPropagationAllowed) {
              stopEvent(event);
            }
          }
        },
      },
      elementProps,
      getButtonProps,
    ],
  });

  return <>{getElement()}</>;
}

export interface ComboboxChipRemoveState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface ComboboxChipRemoveProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxChipRemoveState> {}

export namespace ComboboxChipRemove {
  export type State = ComboboxChipRemoveState;
  export type Props = ComboboxChipRemoveProps;
}

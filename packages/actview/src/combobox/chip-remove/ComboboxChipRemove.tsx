import { computed, defineComponent } from 'actview';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { useComboboxChipContext } from '@/combobox/chip/ComboboxChipContext';
import { useButton } from '@/internals/use-button';
import { stopEvent } from '@/floating-ui-actview/utils';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { findItemIndex } from '@/internals/itemEquality';
import { mergePropsN } from '@/merge-props';

/**
 * A button to remove a chip.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxChipRemove = defineComponent(function (componentProps: ComboboxChipRemove.Props) {
  // ================= setup（只执行一次） =================
  const store = useComboboxRootContext();
  const chipContext = useComboboxChipContext();
  const chipIndex = computed(() => chipContext.value.index);

  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const selectedValue = store.useState('selectedValue');
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  const disabled = computed(() => comboboxDisabled.value || (componentProps.disabled ?? false));

  const { buttonRef, getButtonProps } = useButton({
    native: computed(() => componentProps.nativeButton ?? true),
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
    const removedItem = selectedValue.value[chipIndex.value];

    clearActiveIndexForRemovedItem(removedItem);

    store.state.setSelectedValue(
      selectedValue.value.filter((_: any, i: number) => i !== chipIndex.value),
      eventDetails,
    );

    store.state.inputRef.current?.focus();
    return eventDetails;
  }

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      disabled: _disabled,
      nativeButton: _nativeButton,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const merged = mergePropsN([
      elementProps,
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
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
      (p: HTMLProps) => getButtonProps(p),
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: buttonRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={buttonRef} />;
    }
    return <button ref={buttonRef} {...merged} />;
  };
}) as (props: ComboboxChipRemove.Props) => any;

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
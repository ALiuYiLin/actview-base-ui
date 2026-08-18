import { computed } from 'actview';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxChipsContext } from '../chips/ComboboxChipsContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { ComboboxChipContext } from './ComboboxChipContext';
import { stopEvent } from '../../floating-ui-actview/utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { getChipNavigationKeys, getIndexAfterChipRemoval } from '../utils/parts';

/**
 * An individual chip that represents a value in a multiselectable input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxChip(componentProps: ComboboxChip.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();
  const chipsContext = useComboboxChipsContext();
  const { setHighlightedChipIndex, chipsRef } = chipsContext.value!;
  const direction = useDirection();

  const disabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const selectedValue = store.useState('selectedValue');

  // `guess` seeds the index from render order: ActView's keyed diffs don't re-fire ref
  // callbacks, so the composite registry's post-flush index sync may lag or never run for
  // statically rendered chips.
  const { ref, index } = useCompositeListItem({ guess: true });

  function handleKeyDown(event: KeyboardEvent): number | undefined {
    let nextIndex: number | undefined = index.value;
    const [previousChipKey, nextChipKey] = getChipNavigationKeys(direction.value);

    if (event.key === previousChipKey) {
      event.preventDefault();
      if (index.value > 0) {
        nextIndex = index.value - 1;
      } else {
        nextIndex = undefined;
      }
    } else if (event.key === nextChipKey) {
      event.preventDefault();
      if (index.value < chipsRef.current.length - 1) {
        nextIndex = index.value + 1;
      } else {
        nextIndex = undefined;
      }
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      nextIndex = getIndexAfterChipRemoval(index.value, selectedValue.value.length);

      stopEvent(event);

      store.state.setIndices({
        activeIndex: null,
        selectedIndex: null,
        type: REASONS.keyboard,
      });
      store.state.setSelectedValue(
        selectedValue.value.filter((_: any, i: number) => i !== index.value),
        createChangeEventDetails(REASONS.none, event),
      );
    } else if (event.key === 'Enter' || event.key === ' ') {
      stopEvent(event);
      nextIndex = undefined;
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      stopEvent(event);
      store.state.setOpen(
        true,
        createChangeEventDetails(REASONS.listNavigation, event),
      );
      nextIndex = undefined;
    } else if (
      // Check for printable characters (letters, numbers, symbols)
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      nextIndex = undefined;
    }

    return nextIndex;
  }

  const state = computed<ComboboxChipState>(() => ({
    disabled: disabled.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, ref],
    state,
    props: [
      {
        tabIndex: -1,
        'aria-disabled': disabled.value || undefined,
        'aria-readonly': readOnly.value || undefined,
        onKeyDown(event: KeyboardEvent) {
          if (disabled.value || readOnly.value) {
            return;
          }

          const nextIndex = handleKeyDown(event);

          setHighlightedChipIndex(nextIndex);

          if (nextIndex === undefined) {
            store.state.inputRef.current?.focus();
          } else {
            chipsRef.current[nextIndex]?.focus();
          }
        },
      },
      elementProps,
    ],
  });

  const contextValue = computed<ComboboxChipContext>(() => ({
    index: index.value,
  }));

  return (
    <ComboboxChipContext.Provider value={contextValue}>
      {getElement()}
    </ComboboxChipContext.Provider>
  );
}

export interface ComboboxChipState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface ComboboxChipProps extends BaseUIComponentProps<'div', ComboboxChipState> {}

export namespace ComboboxChip {
  export type State = ComboboxChipState;
  export type Props = ComboboxChipProps;
}

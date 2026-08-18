import { computed, ref, watch } from 'actview';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { ComboboxChipsContext } from './ComboboxChipsContext';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { handleInputPress } from '../utils/handleInputPress';

/**
 * A container for the chips in a multiselectable input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxChips(componentProps: ComboboxChips.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();

  const open = store.useState('open');
  const hasSelectionChips = store.useState('hasSelectionChips');

  const highlightedChipIndex = ref<number | undefined>(undefined);
  const setHighlightedChipIndex = (next: number | undefined) => {
    highlightedChipIndex.value = next;
  };

  // When the popup opens, drop the chip highlight.
  watch(
    open,
    (isOpen) => {
      if (isOpen && highlightedChipIndex.value !== undefined) {
        highlightedChipIndex.value = undefined;
      }
    },
    { immediate: true },
  );

  const chipsRef = { current: [] as Array<HTMLButtonElement | null> };

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, store.state.chipsContainerRef],
    // NVDA enters browse mode instead of staying in focus mode when navigating with
    // arrow keys inside a container unless it has a toolbar role.
    props: [
      hasSelectionChips.value ? { role: 'toolbar' } : EMPTY_OBJECT,
      {
        onMouseDown(event: MouseEvent) {
          handleInputPress(event, store, store.state.disabled, store.state.readOnly);
        },
      },
      elementProps,
    ],
  });

  const contextValue = computed<ComboboxChipsContext>(() => ({
    highlightedChipIndex: highlightedChipIndex.value,
    setHighlightedChipIndex,
    chipsRef,
  }));

  return (
    <ComboboxChipsContext.Provider value={contextValue}>
      <CompositeList elementsRef={chipsRef}>{getElement()}</CompositeList>
    </ComboboxChipsContext.Provider>
  );
}

export interface ComboboxChipsState {}

export interface ComboboxChipsProps extends BaseUIComponentProps<'div', ComboboxChipsState> {}

export namespace ComboboxChips {
  export type State = ComboboxChipsState;
  export type Props = ComboboxChipsProps;
}

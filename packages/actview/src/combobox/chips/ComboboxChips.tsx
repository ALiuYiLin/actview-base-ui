import { computed, defineComponent, ref, watch } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { ComboboxChipsContext } from '@/combobox/chips/ComboboxChipsContext';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { handleInputPress } from '@/combobox/utils/handleInputPress';
import { mergePropsN } from '@/merge-props';

/**
 * A container for the chips in a multiselectable input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxChips = defineComponent(function (componentProps: ComboboxChips.Props) {
  // ================= setup（只执行一次） =================
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

  const rootRef = ref<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, store.state.chipsContainerRef, rootRef);

  const contextValue = computed<ComboboxChipsContext>(() => ({
    highlightedChipIndex: highlightedChipIndex.value,
    setHighlightedChipIndex,
    chipsRef,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const hasSelectionValue = hasSelectionChips.value;

    const merged = mergePropsN([
      hasSelectionChips ? { role: 'toolbar' } : undefined,
      {
        onMouseDown(event: MouseEvent) {
          handleInputPress(event, store, store.state.disabled, store.state.readOnly);
        },
      },
      elementProps,
      {
        className: typeof className === 'function' ? className({} as any) : className,
        style: typeof style === 'function' ? style({} as any) : style,
      },
    ]);

    // render 三形态
    const element = (() => {
      if (typeof render === 'function') {
        return render({ ...merged, ref: mergedRef });
      }
      if (render) {
        const Tag = render.type as any;
        return <Tag key={render.key} {...render.props} {...merged} ref={mergedRef} />;
      }
      return <div ref={mergedRef} {...merged} />;
    })();

    return (
      <ComboboxChipsContext.Provider value={contextValue.value}>
        <CompositeList elementsRef={chipsRef}>{element}</CompositeList>
      </ComboboxChipsContext.Provider>
    );
  };
}) as (props: ComboboxChips.Props) => any;

export interface ComboboxChipsState {}

export interface ComboboxChipsProps extends BaseUIComponentProps<'div', ComboboxChipsState> {}

export namespace ComboboxChips {
  export type State = ComboboxChipsState;
  export type Props = ComboboxChipsProps;
}
import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useComboboxChipsContext } from '@/combobox/chips/ComboboxChipsContext';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { ComboboxChipContext } from '@/combobox/chip/ComboboxChipContext';
import { stopEvent } from '@/floating-ui-actview/utils';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { getChipNavigationKeys, getIndexAfterChipRemoval } from '@/combobox/utils/parts';
import { mergePropsN } from '@/merge-props';

/**
 * An individual chip that represents a value in a multiselectable input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxChip = defineComponent(function (componentProps: ComboboxChip.Props) {
  // ================= setup（只执行一次） =================
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
  const { ref: listItemRef, index } = useCompositeListItem({ guess: true });

  const rootRef = ref<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, listItemRef, rootRef);

  const state = computed<ComboboxChipState>(() => ({
    disabled: disabled.value,
  }));

  const contextValue = computed<ComboboxChipContext>(() => ({
    index: index.value,
  }));

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

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const merged = mergePropsN([
      elementProps,
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
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    const element = (() => {
      if (typeof render === 'function') {
        return render({ ...merged, ...stateValue, ref: mergedRef });
      }
      if (render) {
        const Tag = render.type as any;
        return <Tag key={render.key} {...render.props} {...merged} ref={mergedRef} />;
      }
      return <div ref={mergedRef} {...merged} />;
    })();

    return (
      <ComboboxChipContext.Provider value={contextValue.value}>
        {element}
      </ComboboxChipContext.Provider>
    );
  };
}) as (props: ComboboxChip.Props) => any;

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
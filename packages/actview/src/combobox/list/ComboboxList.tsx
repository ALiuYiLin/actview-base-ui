import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  useComboboxDerivedItemsContext,
  useComboboxFloatingContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import { ComboboxCollection } from '../collection/ComboboxCollection';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { stopEvent } from '../../floating-ui-actview/utils';
import { clickHighlightedItem } from '../utils/parts';

/**
 * A list container for the items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxList(componentProps: ComboboxList.Props & { children?: any }) {
  const {
    render: _render,
    className: _className,
    style: _style,
    children,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();
  const floatingRootContext = useComboboxFloatingContext();
  // `useComboboxPositionerContext` registers a context subscription (setup-only), so it must be
  // called at the top level, not inside a `computed` (which evaluates lazily outside setup).
  const positionerContext = useComboboxPositionerContext(true);
  const hasPositionerContext = computed(() => positionerContext.value !== undefined);
  const derivedItems = useComboboxDerivedItemsContext();
  const { filteredItems, hasItems } = derivedItems.value;

  const selectionMode = store.useState('selectionMode');
  const grid = store.useState('grid');
  const listProps = store.useState('listProps');
  const virtualized = store.useState('virtualized');
  const forceMounted = store.useState('forceMounted');

  const multiple = computed(() => selectionMode.value === 'multiple');
  const empty = computed(() => filteredItems.length === 0);

  const setPositionerElement = store.useStateSetter('positionerElement');
  const setListElement = store.useStateSetter('listElement');

  // Support "closed template" API: if children is a function, implicitly wrap it
  // with a Combobox.Collection that reads items from context/root.
  const resolvedChildren = computed(() => {
    if (typeof children === 'function') {
      return <ComboboxCollection>{children}</ComboboxCollection>;
    }
    return children;
  });

  const state = computed<ComboboxListState>(() => ({
    empty: empty.value,
  }));

  const floatingId = floatingRootContext.useState('floatingId');

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [
      componentProps.ref,
      setListElement,
      hasPositionerContext.value ? null : setPositionerElement,
    ],
    props: [
      (prev: any) => ({
        ...prev,
        ...listProps.value,
        children: resolvedChildren.value,
        tabIndex: -1,
        id: floatingId.value,
        role: grid.value ? 'grid' : 'listbox',
        'aria-multiselectable': multiple.value ? 'true' : undefined,
        onKeyDown(event: KeyboardEvent) {
          if (store.state.disabled || store.state.readOnly) {
            return;
          }

          if (event.key === 'Enter') {
            const activeIndex = store.state.activeIndex;

            if (activeIndex == null) {
              // Allow form submission when no item is highlighted.
              return;
            }

            stopEvent(event);
            clickHighlightedItem(store, activeIndex, event);
          }
        },
        onKeyDownCapture() {
          store.state.keyboardActiveRef.current = true;
        },
        onPointerMoveCapture() {
          store.state.keyboardActiveRef.current = false;
        },
      }),
      elementProps,
    ],
  });

  if (virtualized.value) {
    return <>{getElement()}</>;
  }

  // With the `items` prop, the root derives `listRef` from the filtered items directly (see
  // `AriaCombobox`'s valuesRef sync), and items resolve their index from the derived-items
  // context (`ComboboxItemVirtualizedIndex`). A CompositeList would overwrite `listRef` with
  // stale DOM entries: ActView keyed diffs don't re-fire ref callbacks on filter changes.
  if (hasItems) {
    return <>{getElement()}</>;
  }

  // Rendered labels only need to be registered when the list is force-mounted to match
  // browser autofill against rendered text.
  const labelsRef = !forceMounted.value ? undefined : store.state.labelsRef;

  return (
    <CompositeList elementsRef={store.state.listRef} labelsRef={labelsRef}>
      {getElement()}
    </CompositeList>
  );
}

export interface ComboboxListState {
  /**
   * Whether the list is empty.
   */
  empty: boolean;
}

export interface ComboboxListProps extends Omit<
  BaseUIComponentProps<'div', ComboboxListState>,
  'children'
> {
  /**
   * Render-prop children: when a function is passed, it is implicitly wrapped in a
   * `<Combobox.Collection>` that renders the filtered items.
   */
  children?: ((item: any, index: number) => any) | any;
}

export namespace ComboboxList {
  export type State = ComboboxListState;
  export type Props = ComboboxListProps & { children?: any };
}

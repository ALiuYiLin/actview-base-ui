import { computed, ref } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ComboboxGroupContext } from './ComboboxGroupContext';
import { GroupCollectionProvider } from '../collection/GroupCollectionContext';

/**
 * Groups related items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxGroup(componentProps: ComboboxGroup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    items,
    ...elementProps
  } = componentProps;

  const labelId = ref<string | undefined>(undefined);
  const setLabelId: ComboboxGroupContext['setLabelId'] = (next) => {
    labelId.value = typeof next === 'function' ? next(labelId.value) : next;
  };

  const contextValue = computed<ComboboxGroupContext>(() => ({
    labelId: labelId.value,
    setLabelId,
    items,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [
      (prev: any) => ({ ...prev, role: 'group', 'aria-labelledby': labelId.value }),
      elementProps,
    ],
  });

  const wrappedElement = (
    <ComboboxGroupContext.Provider value={contextValue}>
      {getElement()}
    </ComboboxGroupContext.Provider>
  );

  if (items) {
    return <GroupCollectionProvider items={items}>{wrappedElement}</GroupCollectionProvider>;
  }

  // Must end with a JSX literal so the Babel transform wraps the component (AI-003):
  // returning the `wrappedElement` variable would keep this a bare function.
  return <>{wrappedElement}</>;
}

export interface ComboboxGroupState {}

export interface ComboboxGroupProps extends BaseUIComponentProps<'div', ComboboxGroupState> {
  /**
   * Items to be rendered within this group.
   * When provided, child `Collection` components will use these items.
   */
  items?: readonly any[] | undefined;
}

export namespace ComboboxGroup {
  export type State = ComboboxGroupState;
  export type Props = ComboboxGroupProps;
}

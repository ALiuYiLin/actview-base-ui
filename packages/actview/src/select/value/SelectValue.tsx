import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSelectRootContext } from '../root/SelectRootContext';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../internals/resolveValueLabel';
import { selectors } from '../store';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';

const stateAttributesMapping: StateAttributesMapping<SelectValueState> = {
  value: () => null,
};

/**
 * A text label of the currently selected item.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectValue(componentProps: SelectValue.Props) {
  const {
    className: _className,
    render: _render,
    children: childrenProp,
    placeholder,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const { store, valueRef } = rootContext;

  const value = store.useState('value');
  const items = store.useState('items');
  const itemToStringLabel = store.useState('itemToStringLabel');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const shouldCheckNullItemLabel =
    !hasSelectedValue.value && placeholder != null && childrenProp == null;
  const hasNullLabel = store.useState('hasNullItemLabel', shouldCheckNullItemLabel);

  const state = computed<SelectValueState>(() => ({
    value: value.value,
    placeholder: !hasSelectedValue.value,
  }));

  const getChildren = () => {
    if (typeof childrenProp === 'function') {
      return childrenProp(value.value);
    }
    if (childrenProp != null) {
      return childrenProp;
    }
    if (shouldCheckNullItemLabel && !hasNullLabel.value) {
      return placeholder;
    }
    if (Array.isArray(value.value)) {
      return resolveMultipleLabels(value.value, items.value, itemToStringLabel.value);
    }
    return resolveSelectedLabel(value.value, items.value, itemToStringLabel.value);
  };

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: [componentProps.ref, valueRef],
    props: [
      (prev: any) => ({ ...prev, children: getChildren() }),
      elementProps,
    ],
    stateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface SelectValueState {
  /**
   * The value of the currently selected item.
   */
  value: any;
  /**
   * Whether the placeholder is being displayed.
   */
  placeholder: boolean;
}

export interface SelectValueProps
  extends Omit<BaseUIComponentProps<'span', SelectValueState>, 'children'> {
  /**
   * Accepts a function that returns a node to format the selected value.
   */
  children?: any | ((value: any) => any);
  /**
   * The placeholder value to display when no value is selected.
   * This is overridden by `children` if specified, or by a null item's label in `items`.
   */
  placeholder?: any;
}

export namespace SelectValue {
  export type State = SelectValueState;
  export type Props = SelectValueProps;
}

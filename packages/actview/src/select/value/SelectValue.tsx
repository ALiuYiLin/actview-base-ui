import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import type { HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSelectRootContext } from '@/select/root/SelectRootContext';
import { resolveMultipleLabels, resolveSelectedLabel } from '@/internals/resolveValueLabel';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { mergePropsN } from '@/merge-props';

const stateAttributesMapping: StateAttributesMapping<SelectValueState> = {
  value: () => null,
};

/**
 * A text label of the currently selected item.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export const SelectValue = defineComponent(function (componentProps: SelectValue.Props) {
  // ================= setup（只执行一次） =================
  const rootContext = useSelectRootContext().value!;
  const { store, valueRef } = rootContext;

  const value = store.useState('value');
  const items = store.useState('items');
  const itemToStringLabel = store.useState('itemToStringLabel');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const shouldCheckNullItemLabel =
    !hasSelectedValue.value && componentProps.placeholder != null && componentProps.children == null;
  const hasNullLabel = store.useState('hasNullItemLabel', shouldCheckNullItemLabel);

  const state = computed<SelectValueState>(() => ({
    value: value.value,
    placeholder: !hasSelectedValue.value,
  }));

  const rootRef = ref<HTMLSpanElement | null>(null);
  const mergedRef = useMergedRefs(componentProps.ref, valueRef, rootRef);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      children: childrenProp,
      placeholder,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

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

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        children: getChildren(),
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: mergedRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={mergedRef} />;
    }
    return <span ref={mergedRef} {...merged} />;
  };
}) as (props: SelectValue.Props) => any;

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
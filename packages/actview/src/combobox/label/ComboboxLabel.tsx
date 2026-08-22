import { computed, defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { FieldRoot } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { getDefaultLabelId } from '@/utils/resolveAriaLabelledBy';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { mergePropsN } from '@/merge-props';

/**
 * An accessible label that is automatically associated with the combobox trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxLabel = defineComponent(function (componentProps: ComboboxLabel.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const fieldRootContext = useFieldRootContext();
  const store = useComboboxRootContext();

  const inputInsidePopup = store.useState('inputInsidePopup');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const rootId = store.useState('id');
  const defaultLabelId = computed(() => getDefaultLabelId(rootId.value));

  const localControlId = computed(() =>
    triggerElement.value?.id ?? (inputInsidePopup.value ? rootId.value : undefined),
  );

  const labelProps = useLabel({
    id: defaultLabelId.value,
    fallbackControlId: localControlId.value,
    setLabelId(nextLabelId: string | undefined) {
      store.set('labelId', nextLabelId);
    },
  });

  const state = computed(() => fieldRootContext.value.state);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
    const elementPropsWithoutId = elementProps as typeof elementProps & { id?: string | undefined };
    delete elementPropsWithoutId.id;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const labelPropsResult = labelProps();

    const merged = mergePropsN([
      stateAttributes,
      labelPropsResult,
      elementPropsWithoutId,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
}) as (props: ComboboxLabel.Props) => any;

export interface ComboboxLabelState extends FieldRoot.State {}

export interface ComboboxLabelProps extends Omit<
  BaseUIComponentProps<'div', ComboboxLabelState>,
  'id'
> {}

export namespace ComboboxLabel {
  export type State = ComboboxLabelState;
  export type Props = ComboboxLabelProps;
}
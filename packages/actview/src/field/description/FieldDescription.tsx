import { computed } from 'actview';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { type FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFieldItemContext } from '../item/FieldItemContext';
import { mergeProps } from '../../merge-props';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldDescription(componentProps: FieldDescription.Props) {
  const id = useBaseUiId(componentProps.id);

  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();

  const state = computed(
    () =>
      ({
        ...fieldRootContext.value.state,
        disabled:
          (fieldRootContext.value.disabled ?? false) || fieldItemContext.value.disabled,
      }) as FieldDescriptionState,
  );

  const addMessageId = () => {
    const current = labelableContext.value.messageIds;
    labelableContext.value.setMessageIds([...current, id]);
  };

  const removeMessageId = () => {
    const current = labelableContext.value.messageIds;
    labelableContext.value.setMessageIds(current.filter((item) => item !== id));
  };

  useIsoLayoutEffect(() => {
    if (!id) {
      return undefined;
    }

    addMessageId();

    return removeMessageId;
  });

  const getElementProps = (externalProps: HTMLProps) => {
    const {
      render: _render,
      id: _idProp,
      className: _className,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return mergeProps(externalProps, elementProps) as HTMLProps;
  };

  const getElement = useRenderElement('p', componentProps, {
    ref: componentProps.ref,
    state,
    props: [() => ({ id }), getElementProps],
    stateAttributesMapping: fieldValidityMapping,
  });

  return getElement();
}

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescriptionState> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}

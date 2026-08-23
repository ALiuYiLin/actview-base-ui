import { defineComponent, toValue, useRootElement } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { useFieldItemContext } from '../item/FieldItemContext';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldLabel = defineComponent(function (componentProps: FieldLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const fieldRootContext = toValue(useFieldRootContext(false));
  const fieldItemContext = toValue(useFieldItemContext());
  const {labelId} = toValue(useLabelableContext());

  const nativeLabel = toValue(componentProps.nativeLabel) ?? true;
  const idProp = toValue(componentProps.id);

  const state = () => ({
    ...fieldRootContext.state.value,
    disabled: fieldRootContext.disabled.value || fieldItemContext.disabled,
  });

  const labelProps = useLabel({
    id: labelId.value ?? idProp,
    native: nativeLabel,
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = state();
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, labelProps, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <label {...merged} ref={rootRef} />;
  };
}) as unknown as (props: FieldLabel.Props) => JSX.Element;

export interface FieldLabelState extends FieldRootState {}

export interface FieldLabelProps extends BaseUIComponentProps<'label', FieldLabelState> {
  /**
   * Whether the component renders a native `<label>` element when replacing it via the `render` prop.
   * Set to `false` if the rendered element is not a label (for example, `<div>`).
   *
   * This is useful to avoid inheriting label behaviors on `<button>` controls (such as `<Select.Trigger>` and `<Combobox.Trigger>`), including avoiding `:hover` on the button when hovering the label, and preventing clicks on the label from firing on the button.
   * @default true
   */
  nativeLabel?: boolean | undefined;
}

export namespace FieldLabel {
  export type State = FieldLabelState;
  export type Props = FieldLabelProps;
}

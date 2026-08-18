import { computed } from 'actview';
import { error } from '@base-ui/actview-utils/error';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useLabel } from '../../internals/labelable-provider/useLabel';
import { useFieldItemContext } from '../item/FieldItemContext';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldLabel(componentProps: FieldLabel.Props) {
  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();

  const state = computed<FieldLabelState>(() => ({
    ...fieldRootContext.value.state,
    disabled:
      (fieldRootContext.value.disabled ?? false) || fieldItemContext.value.disabled,
  }));

  const labelRef: { current: HTMLElement | null } = { current: null };

  const getLabelProps = useLabel({
    id: labelableContext.value.labelId ?? componentProps.id,
    native: componentProps.nativeLabel ?? true,
  });

  function getElementProps(prev: HTMLProps): HTMLProps {
    const {
      render: _render,
      className: _className,
      id: _idProp,
      nativeLabel: _nativeLabel,
      style: _style,
      ...elementProps
    } = componentProps;

    const labelProps = getLabelProps();

    if (process.env.NODE_ENV !== 'production' && labelRef.current) {
      const isLabelTag = labelRef.current.tagName === 'LABEL';
      const nativeLabel = componentProps.nativeLabel ?? true;

      if (nativeLabel && !isLabelTag) {
        error(
          '<Field.Label> expected a <label> element because the `nativeLabel` prop is true. ' +
            'Rendering a non-<label> disables native label association, so `htmlFor` will not ' +
            'work. Use a real <label> in the `render` prop, or set `nativeLabel` to `false`.',
        );
      } else if (!nativeLabel && isLabelTag) {
        error(
          '<Field.Label> expected a non-<label> element because the `nativeLabel` prop is false. ' +
            'Rendering a <label> assumes native label behavior while Base UI treats it as ' +
            'non-native, which can cause unexpected pointer behavior. Use a non-<label> in the ' +
            '`render` prop, or set `nativeLabel` to `true`.',
        );
      }
    }

    return {
      ...prev,
      ...labelProps,
      ...elementProps,
    };
  }

  const getElement = useRenderElement('label', componentProps, {
    ref: [componentProps.ref, labelRef],
    state,
    props: [getElementProps],
    stateAttributesMapping: fieldValidityMapping,
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

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

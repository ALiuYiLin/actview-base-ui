import { computed } from 'actview';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { type FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useValueChanged } from '../../internals/useValueChanged';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { activeElement } from '../../floating-ui-actview/utils';
import { mergeProps } from '../../merge-props';

/**
 * The form control to label and validate.
 * Renders an `<input>` element.
 *
 * You can omit this part and use any Base UI input component instead. For example,
 * [Input](https://base-ui.com/react/components/input), [Checkbox](https://base-ui.com/react/components/checkbox),
 * or [Select](https://base-ui.com/react/components/select), among others, will work with Field out of the box.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldControl(componentProps: FieldControl.Props) {
  const fieldRootContext = useFieldRootContext();
  const formContext = useFormContext();
  const labelableContext = useLabelableContext();

  const setTouched = fieldRootContext.value.setTouched;
  const setDirty = fieldRootContext.value.setDirty;
  const setFocused = fieldRootContext.value.setFocused;
  const setFilled = fieldRootContext.value.setFilled;
  const validation = fieldRootContext.value.validation;
  const clearErrors = formContext.value.clearErrors;

  const disabled = computed(
    () => (fieldRootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  );
  const name = computed(() => fieldRootContext.value.name ?? componentProps.name);
  const validityData = computed(() => fieldRootContext.value.validityData);
  const validationMode = computed(() => fieldRootContext.value.validationMode);

  const state = computed(
    () =>
      ({
        ...fieldRootContext.value.state,
        disabled: disabled.value,
      }) as FieldControlState,
  );

  const labelId = computed(() => labelableContext.value.labelId);

  const id = useLabelableId({ id: computed(() => componentProps.id) });

  const valueControlled = useControlled({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue,
    name: 'FieldControl',
    state: 'value',
  });

  const isControlled = computed(() => componentProps.value !== undefined);
  const value = computed(() => (isControlled.value ? valueControlled.value : undefined));
  // The DOM value is always a string, so dirty comparisons must serialize the controlled value.
  const serializedValue = computed(() => (value.value == null ? undefined : String(value.value)));

  const getValueFromInput = () => validation.inputRef.current?.value;

  useRegisterFieldControl(
    validation.inputRef,
    computed(() => id.value ?? undefined),
    serializedValue,
    getValueFromInput,
    computed(() => !disabled.value),
    computed(() => componentProps.name),
  );

  useIsoLayoutEffect(() => {
    if (validation.inputRef.current?.value) {
      setFilled(true);
    }
  });

  useValueChanged(serializedValue, () => {
    if (serializedValue.value === undefined) {
      return;
    }

    clearErrors(name.value);
    setDirty(serializedValue.value !== (validityData.value.initialValue ?? ''));
    setFilled(serializedValue.value !== '');

    validation.change(serializedValue.value);
  });

  const inputRef: { current: HTMLElement | null } = { current: null };

  useIsoLayoutEffect(() => {
    if (componentProps.autoFocus && inputRef.current === activeElement(ownerDocument(inputRef.current))) {
      setFocused(true);
    }
  });

  const getControlProps = () => ({
    id: id.value ?? undefined,
    disabled: disabled.value,
    name: name.value,
    ref: (node: HTMLInputElement | null) => {
      validation.inputRef.current = node;
      // ActView's renderer treats `defaultValue` as a plain attribute (setAttribute),
      // which does not set the input's `.value` (plantform-diff.md PD-01/PD-19). Mirror
      // React's behavior by assigning the property directly.
      if (node && !isControlled.value && componentProps.defaultValue !== undefined) {
        node.defaultValue = String(componentProps.defaultValue);
      }
    },
    'aria-labelledby': labelId.value ?? undefined,
    autoFocus: componentProps.autoFocus,
    ...(isControlled.value ? { value: value.value } : { defaultValue: componentProps.defaultValue }),
    onInput(event: InputEvent) {
      const input = event.currentTarget as HTMLInputElement;
      const inputValue = input.value;
      const details = createChangeEventDetails(REASONS.none, event);
      componentProps.onValueChange?.(inputValue, details);

      // Controlled values sync from the `value` prop instead, so that a value the consumer
      // rejects or rewrites never reaches the field state.
      if (isControlled.value) {
        return;
      }

      // `validation.change` reads `markedDirtyRef`, so update dirty before validating.
      setDirty(inputValue !== (validityData.value.initialValue ?? ''));
      setFilled(inputValue !== '');

      // Workaround for https://github.com/react/react/issues/9023
      if (!event.defaultPrevented && !details.isCanceled) {
        clearErrors(name.value);
        validation.change(inputValue);
      }
    },
    onFocus() {
      setFocused(true);
    },
    onBlur(event: FocusEvent) {
      setTouched(true);
      setFocused(false);

      if (validationMode.value === 'onBlur') {
        validation.commit((event.currentTarget as HTMLInputElement).value);
      }
    },
    onKeyDown(event: KeyboardEvent) {
      if ((event.currentTarget as HTMLElement).tagName === 'INPUT' && event.key === 'Enter') {
        setTouched(true);
        validation.commit((event.currentTarget as HTMLInputElement).value);
      }
    },
  });

  const getElementProps = (externalProps: HTMLProps) => {
    const {
      render: _render,
      className: _className,
      id: _idProp,
      name: _nameProp,
      value: _valueProp,
      disabled: _disabledProp,
      onValueChange: _onValueChange,
      defaultValue: _defaultValue,
      autoFocus: _autoFocus,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return mergeProps(externalProps, elementProps) as HTMLProps;
  };

  const getElement = useRenderElement('input', componentProps, {
    ref: [componentProps.ref, inputRef],
    state,
    props: [getControlProps, getElementProps, (p) => validation.getValidationProps(disabled.value, p)],
    stateAttributesMapping: fieldValidityMapping,
  });

  // Must end with a JSX return so the Babel transform wraps this component in
  // `defineComponent` (issue #19).
  return <>{getElement()}</>;
}

export interface FieldControlState extends FieldRootState {}

export interface FieldControlProps extends BaseUIComponentProps<'input', FieldControlState> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  defaultValue?: string | number | readonly string[] | undefined;
}

export type FieldControlChangeEventReason = typeof REASONS.none;

export type FieldControlChangeEventDetails =
  BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldControl {
  export type State = FieldControlState;
  export type Props = FieldControlProps;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}

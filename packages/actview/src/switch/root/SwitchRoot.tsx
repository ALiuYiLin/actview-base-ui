import { computed, defineComponent, ref, watch } from 'actview';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type {
  BaseUIComponentProps,
  HTMLProps,
  NonNativeButtonProps,
  RefValue,
} from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useButton } from '../../internals/use-button';
import { SwitchRootContext } from './SwitchRootContext';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { BaseUIChangeEventDetails } from '../../types';
import { useValueChanged } from '../../internals/useValueChanged';
import { mergePropsN } from '../../merge-props';

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export const SwitchRoot = defineComponent(function (componentProps: SwitchRoot.Props) {
  // ================= setup（只执行一次） =================
  const formContext = useFormContext();
  const fieldRootContext = useFieldRootContext();
  const labelableContext = useLabelableContext();

  const disabled = computed(
    () => fieldRootContext.value.disabled || (componentProps.disabled ?? false),
  );
  const name = computed(() => fieldRootContext.value.name ?? componentProps.name);

  const inputRef = { current: null as HTMLInputElement | null };
  const handleInputRef = useMergedRefs(
    inputRef,
    componentProps.inputRef,
    fieldRootContext.value.validation.inputRef,
  );

  const switchRef = { current: null as HTMLButtonElement | null };

  const id = useBaseUiId();

  const controlId = useLabelableId({ id: computed(() => componentProps.id) });
  const nativeButton = computed(() => componentProps.nativeButton ?? false);
  const hiddenInputId = computed(() => (nativeButton.value ? undefined : controlId.value));

  const checked = useControlled<boolean>({
    controlled: () => componentProps.checked,
    default: () => Boolean(componentProps.defaultChecked),
    name: 'Switch',
    state: 'checked',
  });

  useRegisterFieldControl(
    switchRef,
    id,
    checked,
    undefined,
    computed(() => !disabled.value),
    computed(() => componentProps.name),
  );

  useIsoLayoutEffect(() => {
    if (inputRef.current) {
      fieldRootContext.value.setFilled(inputRef.current.checked);
    }
  });

  useValueChanged(checked, () => {
    formContext.value.clearErrors(name.value);
    fieldRootContext.value.setDirty(
      checked.value !== fieldRootContext.value.validityData.initialValue,
    );
    fieldRootContext.value.setFilled(Boolean(checked.value));
    fieldRootContext.value.validation.change(checked.value);
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  watch(buttonRef, (el) => {
    switchRef.current = el as HTMLButtonElement | null;
  });

  const ariaLabelledBy = useAriaLabelledBy(
    computed(() => componentProps['aria-labelledby'] as string | undefined),
    computed(() => labelableContext.value.labelId),
    inputRef,
    computed(() => !nativeButton.value),
    computed(() => hiddenInputId.value ?? undefined),
  );

  const state = computed(
    () =>
      ({
        ...fieldRootContext.value.state,
        checked: checked.value,
        disabled: disabled.value,
        readOnly: componentProps.readOnly ?? false,
        required: componentProps.required ?? false,
      }) as SwitchRootState,
  );

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      checked: _checked,
      defaultChecked: _defaultChecked,
      'aria-labelledby': _ariaLabelledBy,
      form,
      id: _id,
      inputRef: _inputRef,
      name: _name,
      nativeButton: _nativeButton,
      onCheckedChange: _onCheckedChange,
      readOnly,
      required,
      disabled: _disabled,
      uncheckedValue,
      value,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;
    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const readOnlyBool = readOnly ?? false;
    const requiredBool = required ?? false;

    const rootProps = {
      id: nativeButton.value ? (controlId.value ?? undefined) : id,
      role: 'switch',
      'aria-checked': checked.value,
      'aria-readonly': readOnlyBool || undefined,
      'aria-required': requiredBool || undefined,
      'aria-labelledby': ariaLabelledBy.value,
      onFocus() {
        if (!disabled.value) {
          fieldRootContext.value.setFocused(true);
        }
      },
      onBlur() {
        const element = inputRef.current;
        if (!element || disabled.value) {
          return;
        }

        fieldRootContext.value.setTouched(true);
        fieldRootContext.value.setFocused(false);

        if (fieldRootContext.value.validationMode === 'onBlur') {
          fieldRootContext.value.validation.commit(element.checked);
        }
      },
      onClick(event: MouseEvent) {
        if (readOnlyBool || disabled.value) {
          return;
        }

        event.preventDefault();

        const input = inputRef.current;
        if (!input) {
          return;
        }

        dispatchClickWithModifiers(input, event);
      },
    };

    const merged = mergePropsN([
      rootProps as any,
      stateAttributes,
      elementProps,
      getButtonProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
      (externalProps: HTMLProps) =>
        fieldRootContext.value.validation.getValidationProps(disabled.value, externalProps),
    ] as any);

    const inputProps = {
      ...fieldRootContext.value.validation.getValidationProps(disabled.value),
      checked: checked.value,
      disabled: disabled.value,
      form,
      id: hiddenInputId.value,
      name: name.value,
      required: requiredBool,
      style: name.value ? visuallyHiddenInput : visuallyHidden,
      tabIndex: -1,
      type: 'checkbox' as const,
      'aria-hidden': true,
      ref: handleInputRef,
      onChange(event: Event) {
        if (readOnlyBool) {
          event.preventDefault();
          return;
        }

        const nextChecked = (event.currentTarget as HTMLInputElement).checked;
        const eventDetails = createChangeEventDetails(REASONS.none, event);

        componentProps.onCheckedChange?.(nextChecked, eventDetails);

        if (eventDetails.isCanceled) {
          return;
        }

        checked.setValueIfUncontrolled(nextChecked);
      },
      onClick(event: MouseEvent) {
        // The click dispatched from the root's `onClick` is an implementation detail
        // and must not reach ancestors, which already receive the original click.
        event.stopPropagation();
      },
      onFocus() {
        if (buttonRef.value) {
          (buttonRef.value as HTMLElement).focus();
        }
      },
      // React <19 sets an empty value if `undefined` is passed explicitly.
      // To avoid this, we only set the value if it's defined.
      ...(value !== undefined ? { value } : EMPTY_OBJECT),
    };

    // render 三形态（根元素）
    let rootElement: any;
    if (typeof render === 'function') {
      rootElement = render({ ...merged, ...stateValue, ref: buttonRef });
    } else if (render) {
      const Tag = render.type as any;
      rootElement = <Tag key={render.key} {...render.props} {...merged} ref={buttonRef} />;
    } else {
      rootElement = <span ref={buttonRef} {...merged} />;
    }

    return (
      <SwitchRootContext.Provider value={state}>
        {rootElement}
        {!checked.value && name.value && uncheckedValue !== undefined && (
          <input
            type="hidden"
            form={form}
            name={name.value}
            value={uncheckedValue}
            disabled={disabled.value}
          />
        )}
        <input {...inputProps} />
      </SwitchRootContext.Provider>
    );
  };
}) as (props: SwitchRoot.Props) => any;

export interface SwitchRootState extends FieldRootState {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchRootProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', SwitchRootState>, 'onChange'> {
  /**
   * The id of the hidden input element.
   *
   * When `nativeButton` is `true`, the id is applied to the root element.
   */
  id?: string | undefined;
  /**
   * Whether the switch is currently active.
   *
   * To render an uncontrolled switch, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   *
   * To render a controlled switch, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: RefValue<HTMLInputElement> | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the switch is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: SwitchRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
}

export type SwitchRootChangeEventReason = typeof REASONS.none;
export type SwitchRootChangeEventDetails = BaseUIChangeEventDetails<SwitchRoot.ChangeEventReason>;

export namespace SwitchRoot {
  export type State = SwitchRootState;
  export type Props = SwitchRootProps;
  export type ChangeEventReason = SwitchRootChangeEventReason;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}
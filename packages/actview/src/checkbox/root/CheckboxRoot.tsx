import { computed, watch } from 'actview';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { ownerWindow } from '@base-ui/actview-utils/owner';
import { getDefaultFormSubmitter } from '@base-ui/actview-utils/getDefaultFormSubmitter';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type {
  BaseUIComponentProps,
  BaseUIEvent,
  HTMLProps,
  NonNativeButtonProps,
  RefValue,
} from '../../internals/types';
import { mergeProps } from '../../merge-props';
import { useButton } from '../../internals/use-button/useButton';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFieldItemContext } from '../../field/item/FieldItemContext';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useCheckboxGroupContext } from '../../checkbox-group/CheckboxGroupContext';
import { CheckboxRootContext } from './CheckboxRootContext';
import {
  BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useValueChanged } from '../../internals/useValueChanged';

export const PARENT_CHECKBOX = 'data-parent';

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxRoot(componentProps: CheckboxRoot.Props) {
  const formContext = useFormContext();
  const fieldRootContext = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();
  const groupContext = useCheckboxGroupContext();

  const parentContext = computed(() =>
    groupContext.value?.allValues === undefined ? undefined : groupContext.value.parent,
  );
  const isGroupedWithParent = computed(() => parentContext.value !== undefined);

  const disabled = computed(
    () =>
      fieldRootContext.value.disabled ||
      fieldItemContext.value.disabled ||
      groupContext.value?.disabled ||
      (componentProps.disabled ?? false),
  );
  const name = computed(() => fieldRootContext.value.name ?? componentProps.name);
  const value = computed(() => componentProps.value ?? name.value);

  const id = useBaseUiId();

  // A `CheckboxGroup` is the field's control and takes its name from `aria-labelledby`, so the
  // checkboxes sharing its labelable scope must not claim the field's control id: they would all
  // render that one id and collide. A `Field.Item` opens a scope the checkbox does own.
  const ownsControlId = computed(
    () => groupContext.value?.registerControlId !== labelableContext.value.registerControlId,
  );

  // `|| undefined` rather than `??`: an empty `id` falls back to the scope's control id.
  const controlId = useLabelableId({
    id: computed(() => componentProps.id || undefined),
    enabled: ownsControlId,
  });

  const nativeButton = computed(() => componentProps.nativeButton ?? false);
  const rootId = computed(() => (nativeButton.value ? controlId.value : id));

  const groupProps = computed(() => {
    if (!isGroupedWithParent.value) {
      return {};
    }

    const parent = parentContext.value!;
    if (componentProps.parent) {
      return parent.getParentProps();
    }

    const val = value.value;
    if (val !== undefined) {
      return parent.getChildProps(val);
    }

    return {};
  });

  const groupChecked = computed(() => groupProps.value.checked ?? componentProps.checked);
  const groupIndeterminate = computed(
    () => groupProps.value.indeterminate ?? (componentProps.indeterminate ?? false),
  );
  const groupOnChange = computed(() => groupProps.value.onCheckedChange);

  const groupValue = computed(() => groupContext.value?.value);

  const controlRef = { current: null as HTMLButtonElement | null };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const validation = computed(
    () => groupContext.value?.validation ?? fieldRootContext.value.validation,
  );

  const checked = useControlled<boolean>({
    controlled: () => {
      const v = value.value;
      const gv = groupValue.value;
      if (v !== undefined && gv !== undefined && !(componentProps.parent ?? false)) {
        return gv.includes(v);
      }
      return groupChecked.value;
    },
    default: () => componentProps.defaultChecked ?? false,
    name: 'Checkbox',
    state: 'checked',
  });

  const computedChecked = computed(() =>
    isGroupedWithParent.value ? Boolean(groupChecked.value) : checked.value,
  );

  const computedIndeterminate = computed(() => {
    const ind = componentProps.indeterminate ?? false;
    if (!isGroupedWithParent.value) {
      return ind;
    }
    return (groupIndeterminate.value ?? ind) || ind;
  });

  useRegisterFieldControl(
    controlRef,
    id,
    checked,
    undefined,
    computed(() => !groupContext.value && !disabled.value),
    computed(() => componentProps.name),
  );

  const inputRef = { current: null as HTMLInputElement | null };
  const registerInput = (element: HTMLInputElement) => {
    const v = groupContext.value ? value.value : undefined;
    return validation.value.registerInput(element, { controlRef, value: v });
  };
  const mergedInputRef = useMergedRefs(
    componentProps.inputRef,
    inputRef,
    componentProps.parent ? undefined : registerInput,
  );

  const ariaLabelledBy = useAriaLabelledBy(
    computed(() => componentProps['aria-labelledby']),
    computed(() => labelableContext.value.labelId),
    inputRef,
    computed(() => !nativeButton.value),
    controlId.value,
  );

  watch(
    [() => checked.value, () => computedIndeterminate.value],
    () => {
      if (inputRef.current) {
        inputRef.current.indeterminate = computedIndeterminate.value;
        if (checked.value) {
          fieldRootContext.value.setFilled(true);
        }
      }
    },
    { immediate: true, flush: 'post' },
  );

  useValueChanged(checked, () => {
    if (groupContext.value) {
      return;
    }

    formContext.value.clearErrors(name.value);
    fieldRootContext.value.setFilled(checked.value);
    fieldRootContext.value.setDirty(
      checked.value !== fieldRootContext.value.validityData.initialValue,
    );

    validation.value.change(checked.value);
  });

  const getInputProps = () =>
    mergeProps(
      {
        checked: checked.value,
        disabled: disabled.value,
        form: componentProps.form,
        // parent checkboxes unset `name` to be excluded from form submission
        name: componentProps.parent ? undefined : name.value,
        // Set `id` to stop Chrome warning about an unassociated input.
        // When using a native button, the `id` is applied to the button instead.
        id: nativeButton.value ? undefined : controlId.value,
        required: componentProps.required,
        ref: mergedInputRef,
        style: name.value ? visuallyHiddenInput : visuallyHidden,
        tabIndex: -1,
        type: 'checkbox',
        'aria-hidden': true,
        onChange(event: Event) {
          if (componentProps.readOnly) {
            event.preventDefault();
            return;
          }

          const nextChecked = (event.currentTarget as HTMLInputElement).checked;
          const details = createChangeEventDetails(REASONS.none, event);

          componentProps.onCheckedChange?.(nextChecked, details);

          if (details.isCanceled) {
            return;
          }

          groupOnChange.value?.(nextChecked, details);

          if (details.isCanceled) {
            return;
          }

          checked.setValueIfUncontrolled(nextChecked);

          const v = value.value;
          if (
            v !== undefined &&
            groupContext.value !== undefined &&
            !(componentProps.parent ?? false) &&
            !isGroupedWithParent.value
          ) {
            const gv = groupContext.value.value;
            const nextGroupValue = nextChecked
              ? [...gv, v]
              : gv.filter((item) => item !== v);

            groupContext.value.setValue(nextGroupValue, details);
          }
        },
        onClick(event: MouseEvent) {
          // The click dispatched from the root's `onClick` is an implementation detail
          // and must not reach ancestors, which already receive the original click.
          event.stopPropagation();
        },
        onFocus() {
          controlRef.current?.focus();
        },
      },
      // React <19 sets an empty value if `undefined` is passed explicitly
      // To avoid this, we only set the value if it's defined
      componentProps.value !== undefined
        ? {
            value:
              (groupContext.value ? checked.value && componentProps.value : componentProps.value) ||
              '',
          }
        : EMPTY_OBJECT,
      labelableContext.value.getDescriptionProps,
      (props) => validation.value.getValidationProps(disabled.value, props),
    );

  watch(
    [() => parentContext.value, () => value.value, () => disabled.value],
    ([pc, val, dis], _old, onCleanup) => {
      if (!pc || val === undefined) {
        return;
      }

      const disabledStates = pc.disabledStatesRef.current;
      disabledStates.set(val, dis);

      onCleanup(() => {
        disabledStates.delete(val);
      });
    },
    { immediate: true },
  );

  const state = computed(
    () =>
      ({
        ...fieldRootContext.value.state,
        checked: computedChecked.value,
        disabled: disabled.value,
        readOnly: componentProps.readOnly ?? false,
        required: componentProps.required ?? false,
        indeterminate: computedIndeterminate.value,
      }) as CheckboxRootState,
  );

  const stateAttributesMapping = getCheckboxStateAttributesMapping(state);

  const getRootProps = () => ({
    id: rootId.value,
    role: 'checkbox',
    'aria-checked': computedIndeterminate.value ? 'mixed' : computedChecked.value,
    'aria-readonly': componentProps.readOnly || undefined,
    'aria-required': componentProps.required || undefined,
    'aria-labelledby': ariaLabelledBy.value,
    [PARENT_CHECKBOX as string]: componentProps.parent ? '' : undefined,
    onFocus() {
      if (!disabled.value) {
        fieldRootContext.value.setFocused(true);
      }
    },
    onBlur() {
      const inputEl = inputRef.current;
      if (!inputEl) {
        return;
      }

      fieldRootContext.value.setTouched(true);
      fieldRootContext.value.setFocused(false);

      if (fieldRootContext.value.validationMode === 'onBlur') {
        validation.value.commit(groupContext.value ? groupValue.value : inputEl.checked);
      }
    },
    onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
      if (event.key !== 'Enter') {
        return;
      }

      // Let consumer `preventDefault()` handlers opt out while defensively stopping
      // any remaining Base UI Enter handling from treating the checkbox as a button.
      event.preventBaseUIHandler();

      if (event.defaultPrevented) {
        return;
      }

      const formToSubmit = inputRef.current?.form ?? null;
      const currentTarget = event.currentTarget as Element;
      const originalPreventDefault = event.preventDefault;
      let preventDefaultCalledAfterPropagation = false;

      event.preventDefault = () => {
        preventDefaultCalledAfterPropagation = true;
        originalPreventDefault.call(event);
      };

      // Enter should not activate/toggle the checkbox. Cancel the native button behavior
      // without setting a `defaultPrevented` that ancestor handlers could observe, so they
      // can still opt out by calling `preventDefault()` during propagation.
      originalPreventDefault.call(event);

      ownerWindow(currentTarget).queueMicrotask(() => {
        event.preventDefault = originalPreventDefault;

        if (!preventDefaultCalledAfterPropagation) {
          getDefaultFormSubmitter(formToSubmit)?.click();
        }
      });
    },
    onClick(event: MouseEvent) {
      if (componentProps.readOnly || disabled.value) {
        return;
      }

      event.preventDefault();

      const input = inputRef.current;
      if (!input) {
        return;
      }

      dispatchClickWithModifiers(input, event);
    },
  });

  const getElementProps = (externalProps: HTMLProps): HTMLProps => {
    const {
      checked: _checked,
      className: _className,
      defaultChecked: _defaultChecked,
      'aria-labelledby': _ariaLabelledBy,
      disabled: _disabled,
      form: _form,
      id: _id,
      indeterminate: _indeterminate,
      inputRef: _inputRef,
      name: _name,
      onCheckedChange: _onCheckedChange,
      parent: _parent,
      readOnly: _readOnly,
      render: _render,
      required: _required,
      uncheckedValue: _uncheckedValue,
      value: _value,
      nativeButton: _nativeButton,
      style: _style,
      ...elementProps
    } = componentProps;
    return mergeProps(externalProps, elementProps) as HTMLProps;
  };

  const getOtherGroupProps = (externalProps: HTMLProps): HTMLProps => {
    const { checked: _checked, indeterminate: _indeterminate, onCheckedChange: _onChange, ...rest } =
      groupProps.value;
    return mergeProps(externalProps, rest) as HTMLProps;
  };

  const getRoot = useRenderElement('span', componentProps, {
    state,
    ref: [buttonRef, controlRef, componentProps.ref],
    props: [
      getRootProps,
      getElementProps,
      getOtherGroupProps,
      getButtonProps,
      labelableContext.value.getDescriptionProps,
      (props) => validation.value.getValidationProps(disabled.value, props),
    ],
    stateAttributesMapping,
  });

  watch(
    [
      () => parentContext.value?.registerChildId,
      () => componentProps.parent,
      () => value.value,
      () => rootId.value,
    ],
    ([registerChildId, parent, val, renderedId], _old, onCleanup) => {
      if (!registerChildId || parent || val === undefined || renderedId == null) {
        return;
      }

      onCleanup(registerChildId(val, renderedId));
    },
    { immediate: true, flush: 'post' },
  );

  return (
    <CheckboxRootContext.Provider value={state}>
      {getRoot()}
      {!checked.value &&
        !groupContext.value &&
        name.value &&
        !(componentProps.parent ?? false) &&
        componentProps.uncheckedValue !== undefined && (
          <input
            type="hidden"
            form={componentProps.form}
            name={name.value}
            value={componentProps.uncheckedValue}
            disabled={disabled.value}
          />
        )}
      <input {...getInputProps()} />
    </CheckboxRootContext.Provider>
  );
}

export interface CheckboxRootState extends FieldRootState {
  /**
   * Whether the checkbox is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   */
  indeterminate: boolean;
}

export interface CheckboxRootProps
  extends
    NonNativeButtonProps,
    Omit<BaseUIComponentProps<'span', CheckboxRootState>, 'onChange' | 'value'> {
  /**
   * The id of the input element.
   */
  id?: string | undefined;
  /**
   * Identifies the field when a form is submitted.
   * @default undefined
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the checkbox is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Whether the checkbox is currently ticked.
   *
   * To render an uncontrolled checkbox, use the `defaultChecked` prop instead.
   * @default undefined
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox is initially ticked.
   *
   * To render a controlled checkbox, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Event handler called when the checkbox is ticked or unticked.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   * @default false
   */
  indeterminate?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: RefValue<HTMLInputElement> | undefined;
  /**
   * Whether the checkbox controls a group of child checkboxes.
   *
   * Must be used in a [Checkbox Group](https://base-ui.com/react/components/checkbox-group).
   * @default false
   */
  parent?: boolean | undefined;
  /**
   * The value submitted with the form when the checkbox is unchecked.
   * By default, unchecked checkboxes do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
  /**
   * The checkbox's value. Identifies it within a [Checkbox Group](https://base-ui.com/react/components/checkbox-group), falling back to `name` when omitted.
   * When submitting a form, a checked box submits `value`; with no `value`, it submits the native "on".
   */
  value?: string | undefined;
}

export type CheckboxRootChangeEventReason = typeof REASONS.none;
export type CheckboxRootChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxRoot.ChangeEventReason>;

export namespace CheckboxRoot {
  export type State = CheckboxRootState;
  export type Props = CheckboxRootProps;
  export type ChangeEventReason = CheckboxRootChangeEventReason;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}

import { computed, onMounted, watch } from 'actview';
import { mergeRefsN } from '@base-ui/actview-utils/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui/actview-utils/visuallyHidden';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type {
  BaseUIComponentProps,
  HTMLProps,
  NonNativeButtonProps,
  RefValue,
} from '../../internals/types';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { ACTIVE_COMPOSITE_ITEM } from '../../internals/composite/constants';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useFieldItemContext } from '../../field/item/FieldItemContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useRadioGroupContext } from '../../radio-group/RadioGroupContext';
import { serializeValue } from '../../internals/serializeValue';
import { RadioRootContext } from './RadioRootContext';

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioRoot<Value>(props: RadioRoot.Props<Value>) {
  const groupContext = useRadioGroupContext();

  const fieldRootContext = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();

  const nativeButton = props.nativeButton ?? false;

  const disabled = computed<boolean>(
    () =>
      fieldRootContext.value.disabled ||
      fieldItemContext.value.disabled ||
      groupContext.value?.disabled ||
      props.disabled ||
      false,
  );
  const readOnly = computed<boolean>(() => groupContext.value?.readOnly || props.readOnly || false);
  const required = computed<boolean>(
    () => groupContext.value?.required || props.required || false,
  );
  const form = computed(() => groupContext.value?.form);
  const name = computed(() => groupContext.value?.name);
  const touched = computed(() => groupContext.value?.touched ?? false);
  const setTouched = (value: boolean) => groupContext.value?.setTouched?.(value);

  const checked = computed<boolean>(() =>
    groupContext.value
      ? groupContext.value.checkedValue === props.value
      : props.value === '',
  );

  const radioRef = { current: null as HTMLElement | null };
  const inputRef = { current: null as HTMLInputElement | null };

  const registerInput = (element: HTMLInputElement | null) => {
    if (element) {
      groupContext.value?.validation?.registerInput(element, {
        controlRef: radioRef,
        value: undefined,
      });
    }
  };

  const registerInputRef = (element: HTMLInputElement | null) => {
    groupContext.value?.registerInputRef?.(element);
  };

  const getInputRef = () =>
    mergeRefsN<HTMLInputElement>([props.inputRef, inputRef, registerInputRef, registerInput]);

  onMounted(() => {
    if (inputRef.current?.checked) {
      fieldRootContext.value.setFilled(true);
    }
  });

  const syncRegisterInputRef = () => {
    if (!inputRef.current) {
      return;
    }

    if (disabled.value && checked.value) {
      registerInputRef(null);
      return;
    }

    registerInputRef(inputRef.current);
  };

  onMounted(syncRegisterInputRef);
  watch([() => checked.value, () => disabled.value], syncRegisterInputRef);

  const id = useBaseUiId();
  const inputId = useLabelableId({ id: () => props.id });
  const hiddenInputId = computed(() => (nativeButton ? undefined : inputId.value));
  const ariaLabelledBy = useAriaLabelledBy(
    () => props['aria-labelledby'],
    () => labelableContext.value.labelId,
    inputRef,
    () => !nativeButton,
    nativeButton ? undefined : (inputId.value ?? undefined),
  );

  const getRootProps = () => ({
    role: 'radio',
    'aria-checked': checked.value,
    'aria-labelledby': ariaLabelledBy.value,
    [ACTIVE_COMPOSITE_ITEM as string]: checked.value ? '' : undefined,
    id: nativeButton ? inputId.value : id,
    onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        // Radio only activates with Space. Preventing the keydown's default
        // stops useButton from turning Enter into a click.
        event.preventDefault();
      }
    },
    onClick(event: MouseEvent) {
      if (event.defaultPrevented || disabled.value || readOnly.value) {
        return;
      }

      event.preventDefault();

      const input = inputRef.current;
      if (!input) {
        return;
      }

      dispatchClickWithModifiers(input, event);
    },
    onFocus(event: FocusEvent) {
      if (event.defaultPrevented || disabled.value || readOnly.value || !touched.value) {
        return;
      }

      inputRef.current?.click();

      setTouched(false);
    },
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
    composite: false,
  });

  const getInputProps = () => ({
    type: 'radio',
    ref: getInputRef(),
    form: form.value,
    id: hiddenInputId.value,
    name: name.value,
    tabIndex: -1,
    style: name.value ? visuallyHiddenInput : visuallyHidden,
    'aria-hidden': true,
    ...(props.value !== undefined ? { value: serializeValue(props.value) } : EMPTY_OBJECT),
    disabled: disabled.value,
    checked: checked.value,
    required: required.value,
    readOnly: readOnly.value,
    onChange(event: Event) {
      // Workaround for https://github.com/react/react/issues/9023
      // ActView dispatches native DOM events, so `defaultPrevented` is read directly.
      if (event.defaultPrevented) {
        return;
      }

      if (disabled.value || readOnly.value || props.value === undefined) {
        return;
      }

      const details = createChangeEventDetails(REASONS.none, event);

      groupContext.value?.setCheckedValue?.(props.value, details);

      if (details.isCanceled) {
        return;
      }

      fieldRootContext.value.setTouched(true);
    },
    onClick(event: MouseEvent) {
      // Clicks dispatched on the input from the root's `onClick` and `onFocus` are an
      // implementation detail and must not reach ancestors.
      event.stopPropagation();
    },
    onFocus() {
      radioRef.current?.focus();
    },
  });

  const state = computed<RadioRootState>(() => ({
    ...fieldRootContext.value.state,
    required: required.value,
    disabled: disabled.value,
    readOnly: readOnly.value,
    checked: checked.value,
  }));

  const isRadioGroup = computed(() => groupContext.value !== undefined);

  const refs = [props.ref, radioRef, buttonRef];

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      readOnly: _readOnly,
      required: _required,
      'aria-labelledby': _ariaLabelledBy,
      value: _value,
      inputRef: _inputRef,
      nativeButton: _nativeButton,
      id: _id,
      style: _style,
      ref: _ref,
      ...elementProps
    } = props;
    return elementProps;
  };

  const getDescriptionProps = (externalProps: HTMLProps) =>
    labelableContext.value.getDescriptionProps(externalProps);

  const getValidationProps = (externalProps: HTMLProps): HTMLProps =>
    groupContext.value?.validation
      ? groupContext.value.validation.getValidationProps(disabled.value, externalProps)
      : (EMPTY_OBJECT as HTMLProps);

  const elementPropsArray = [
    getRootProps,
    getElementProps,
    getButtonProps,
    getDescriptionProps,
    getValidationProps,
  ];

  const getElement = useRenderElement('span', props, {
    enabled: !isRadioGroup.value,
    state,
    ref: refs,
    props: elementPropsArray,
    stateAttributesMapping,
  });

  return (
    <RadioRootContext.Provider value={state}>
      {isRadioGroup.value ? (
        <CompositeItem
          tag="span"
          render={props.render}
          className={props.className}
          style={props.style}
          state={state.value}
          refs={refs}
          props={elementPropsArray}
          stateAttributesMapping={stateAttributesMapping}
        />
      ) : (
        getElement()
      )}
      <input {...getInputProps()} />
    </RadioRootContext.Provider>
  );
}

export interface RadioRootState extends FieldRootState {
  /**
   * Whether the radio button is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required: boolean;
  /**
   * Whether the radio button has been touched (when wrapped in Field.Root).
   */
  touched: boolean;
  /**
   * Whether the radio button's value has changed from its initial value (when wrapped in Field.Root).
   */
  dirty: boolean;
  /**
   * Whether the radio button is in a valid state (when wrapped in Field.Root).
   */
  valid: boolean | null;
  /**
   * Whether the radio button has a value (when wrapped in Field.Root).
   */
  filled: boolean;
  /**
   * Whether the radio button is focused (when wrapped in Field.Root).
   */
  focused: boolean;
}

export interface RadioRootProps<Value = any>
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', RadioRootState>, 'value'> {
  /**
   * The unique identifying value of the radio in a group.
   */
  value: Value;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly?: boolean | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: RefValue<HTMLInputElement> | undefined;
}

export namespace RadioRoot {
  export type State = RadioRootState;
  export type Props<TValue = any> = RadioRootProps<TValue>;
}

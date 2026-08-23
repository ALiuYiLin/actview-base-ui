import { defineComponent, onMounted, onUnmounted, ref, toValue, watch, useRootElement } from 'actview';
import { addEventListener } from '@/utils/addEventListener';
import { useControlled } from '@/utils/useControlled';
import { useValueAsRef } from '@/utils/useValueAsRef';
import { useForcedRerendering } from '@/utils/useForcedRerendering';
import { useMergedRefs } from '@/utils/useMergedRefs';
import { visuallyHidden, visuallyHiddenInput } from '@/utils/visuallyHidden';
import { ownerDocument } from '@/utils/owner';
import { platform } from '@/utils/platform';
import { formatNumber } from '@/utils/formatNumber';
import { activeElement } from '@/utils/shadowDom';
import { NumberFieldRootContext, type InputMode } from './NumberFieldRootContext';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useFormContext } from '@/internals/form-context/FormContext';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import type { BaseUIComponentProps } from '@/internals/types';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import {
  getFormatParts,
  getNumberLocaleDetails,
  PERMILLE,
  PERCENTAGES,
  SPACE_SEPARATOR_RE,
  BASE_NON_NUMERIC_SYMBOLS,
  MINUS_SIGNS_WITH_ASCII,
  PLUS_SIGNS_WITH_ASCII,
} from '../utils/parse';
import { toValidatedNumber } from '../utils/validate';
import type { EventWithOptionalKeyState, IncrementValueParameters } from '../utils/types';
import {
  createChangeEventDetails,
  createGenericEventDetails,
  type BaseUIChangeEventDetails,
  type BaseUIGenericEventDetails,
  type ReasonToEvent,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';

/**
 * Groups all parts of the number field and manages its state.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export const NumberFieldRoot = defineComponent(function (componentProps: NumberFieldRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const {
    id: idProp,
    min,
    max,
    smallStep = 0.1,
    step: stepProp = 1,
    largeStep = 10,
    required = false,
    disabled: disabledProp = false,
    readOnly = false,
    form,
    name: nameProp,
    defaultValue = null,
    value: valueProp,
    onValueChange: onValueChangeProp,
    onValueCommitted: onValueCommittedProp,
    allowWheelScrub = false,
    snapOnStep = false,
    allowOutOfRange = false,
    format,
    locale,
    inputRef: inputRefProp,
  } = componentProps;

  const fieldContextRef = useFieldRootContext();
  const formContextRef = useFormContext();

  const fieldState = fieldContextRef.value.state;
  const fieldDisabled = fieldContextRef.value.disabled.value;
  const fieldName = fieldContextRef.value.name.value;

  const disabled = fieldDisabled || disabledProp;
  const name = fieldName ?? nameProp;
  const step = stepProp === 'any' ? 1 : stepProp;

  const isScrubbing = ref(false);
  const setIsScrubbing = (v: boolean) => (isScrubbing.value = v);

  const minWithDefault = min ?? Number.MIN_SAFE_INTEGER;
  const maxWithDefault = max ?? Number.MAX_SAFE_INTEGER;
  const minWithZeroDefault = min ?? 0;
  const formatStyle = format?.style;

  const inputRef = {current: null as HTMLInputElement | null};
  const hiddenInputRef = useMergedRefs(inputRefProp as any, fieldContextRef.value.validation.inputRef as any);

  const id = useLabelableId({id: idProp});

  const [value, setValueUnwrapped] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: 'NumberField',
    state: 'value',
  });

  const valueRef = useValueAsRef(value) as unknown as {current: number | null};

  // React 版 useIsoLayoutEffect：filled 状态
  watch(
    () => value.value,
    (v) => {
      fieldContextRef.value.setFilled(v !== null);
    },
    {flush: 'post', immediate: true},
  );

  const forceRender = useForcedRerendering();

  const formatOptionsRef = useValueAsRef(format);

  const hasPendingCommitRef = {current: false};

  const onValueCommitted = (
    nextValue: number | null,
    eventDetails: NumberFieldRoot.CommitEventDetails,
  ) => {
    hasPendingCommitRef.current = false;
    onValueCommittedProp?.(nextValue, eventDetails);
  };

  const allowInputSyncRef = {current: true};
  const lastChangedValueRef = {current: null as number | null};

  const inputValue = ref(formatNumber(value.value as number | null, locale, format));
  const setInputValue = (v: string) => (inputValue.value = v);
  const inputMode = ref<InputMode>('numeric');

  const getAllowedNonNumericKeys = () => {
    const parts = getFormatParts(locale, format);

    const keys = new Set<string>(BASE_NON_NUMERIC_SYMBOLS);
    const addAll = (chars: readonly string[]) => chars.forEach((char) => keys.add(char));

    // Integer formats omit the decimal from `parts`, so fall back to the locale's separator in that
    // case; it must stay typeable regardless of whether the format renders a fraction.
    const decimal =
      parts.find((part) => part.type === 'decimal')?.value ??
      getNumberLocaleDetails(locale, format).decimal;
    keys.add(decimal);

    // Allow every non-digit character the formatter renders — separators, currency symbols, units
    // (e.g. `km/h`, `°C`), exponent separators, and locale literals — decomposed per character
    // because the input validates the typed string one character at a time. `compact` suffixes
    // (e.g. `K`/`M`) are excluded because `parseNumber` can't reverse them.
    parts.forEach((part) => {
      if (
        part.type === 'integer' ||
        part.type === 'fraction' ||
        part.type === 'exponentInteger' ||
        part.type === 'compact'
      ) {
        return;
      }
      addAll(Array.from(part.value));
      if (SPACE_SEPARATOR_RE.test(part.value)) {
        keys.add(' ');
      }
    });

    const allowPercentSymbols =
      formatStyle === 'percent' || (formatStyle === 'unit' && format?.unit === 'percent');
    const allowPermilleSymbols =
      formatStyle === 'percent' || (formatStyle === 'unit' && format?.unit === 'permille');

    // Tolerate percent/permille variants the formatter doesn't emit but users may type or paste.
    if (allowPercentSymbols) {
      addAll(PERCENTAGES);
    }
    if (allowPermilleSymbols) {
      addAll(PERMILLE);
    }

    // Allow plus sign in all cases; minus sign when negatives are valid, or when out-of-range
    // entry is allowed so native underflow validation can be triggered from the keyboard.
    addAll(PLUS_SIGNS_WITH_ASCII);
    if (minWithDefault < 0 || allowOutOfRange) {
      addAll(MINUS_SIGNS_WITH_ASCII);
    }

    return keys;
  };

  const getStepAmount = (event?: EventWithOptionalKeyState) => {
    if (event?.altKey) {
      return smallStep;
    }
    if (event?.shiftKey) {
      return largeStep;
    }
    return step;
  };

  const setValue = (
    unvalidatedValue: number | null,
    details: NumberFieldRoot.ChangeEventDetails,
  ): boolean => {
    const eventWithOptionalKeyState = details.event as EventWithOptionalKeyState;
    const dir = details.direction;

    // Direct text entry (typing, pasting, clearing, autofill) behaves natively; step-based
    // interactions (keyboard arrows, buttons, wheel, scrub) do not. All direct-entry reasons
    // (`input-change`, `input-clear`, `input-blur`, `input-paste`) share the `input-` prefix.
    const isInputReason = details.reason.startsWith('input-') || details.reason === REASONS.none;

    // Only allow out-of-range values for direct text entry. Step-based interactions still clamp.
    const shouldClampValue = !allowOutOfRange || !isInputReason;

    const validatedValue = toValidatedNumber(
      unvalidatedValue,
      dir ? getStepAmount(eventWithOptionalKeyState) * dir : undefined,
      minWithDefault,
      maxWithDefault,
      minWithZeroDefault,
      formatOptionsRef.current,
      snapOnStep,
      eventWithOptionalKeyState?.altKey ?? false,
      shouldClampValue,
    );

    // Notify about a change even when the numeric value is unchanged for input reasons: the
    // typed text may clamp/snap to the current value, or differ while validation normalizes
    // it back to the existing value.
    const shouldFireChange =
      validatedValue !== value.value ||
      (isInputReason && (unvalidatedValue !== value.value || allowInputSyncRef.current === false));

    if (shouldFireChange) {
      onValueChangeProp?.(validatedValue, details);

      if (details.isCanceled) {
        // Report a vetoed change as not applied, so callers don't commit a value never stored.
        return false;
      }

      setValueUnwrapped(validatedValue);
      fieldContextRef.value.setDirty(validatedValue !== fieldContextRef.value.validityData.value.initialValue);
      hasPendingCommitRef.current = true;
    }

    lastChangedValueRef.current = validatedValue as number | null;

    // Keep the visible input in sync immediately when programmatic changes occur
    // (increment/decrement, wheel, etc). During direct typing we don't want
    // to overwrite the user-provided text until blur, so we gate on
    // `allowInputSyncRef`.
    if (allowInputSyncRef.current) {
      setInputValue(formatNumber(validatedValue, locale, format));
    }

    // Formatting can change even if the numeric value hasn't, so ensure a re-render when needed.
    forceRender();

    return shouldFireChange;
  };

  const incrementValue = (
    amount: number,
    {direction, currentValue, event, reason}: IncrementValueParameters,
  ) => {
    const prevValue = currentValue == null ? valueRef.current : currentValue;
    const nativeEvent = event as ReasonToEvent<IncrementValueParameters['reason']> | undefined;

    if (typeof prevValue !== 'number') {
      // Seed an empty field with 0; `setValue` clamps it to the in-range value nearest 0
      // (e.g. `max` for a negative range). No `direction`: the seed isn't a step, so it must
      // not be directionally snapped.
      return setValue(0, createChangeEventDetails(reason, nativeEvent));
    }

    return setValue(
      prevValue + amount * direction,
      createChangeEventDetails(reason, nativeEvent, undefined, {
        direction,
      }),
    );
  };

  // React 版 useIsoLayoutEffect：外部 value prop 变化 → 同步格式化输入
  watch(
    () => [value.value, locale, format] as const,
    () => {
      // This ensures the value is only updated on blur rather than every keystroke, but still
      // allows the input value to be updated when the value is changed externally.
      if (!allowInputSyncRef.current) {
        return;
      }

      const nextInputValue = formatNumber(value.value as number | null, locale, format);

      if (nextInputValue !== inputValue.value) {
        setInputValue(nextInputValue);
      }
    },
    {flush: 'post'},
  );

  // React 版 useIsoLayoutEffect：iOS 动态 inputMode
  watch(
    () => minWithDefault,
    () => {
      if (!platform.os.ios) {
        return;
      }

      // iOS numeric software keyboard doesn't have a minus key, so we need to use the default
      // keyboard to let the user input a negative number.
      let computedInputMode: InputMode = 'text';

      if (minWithDefault >= 0) {
        // iOS numeric software keyboard doesn't have a decimal key for "numeric" input mode, but
        // this is better than the "text" input if possible to use.
        computedInputMode = 'decimal';
      }

      inputMode.value = computedInputMode;
    },
    {flush: 'post', immediate: true},
  );

  // React attaches `onWheel` as a passive listener, so calling `preventDefault` there is ignored.
  // Attach a native (non-passive) `wheel` listener to the input instead to prevent page scrolling.
  let wheelCleanup: (() => void) | undefined;
  onMounted(() => {
    const element = inputRef.current;
    if (disabled || readOnly || !allowWheelScrub || !element) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (
        // Allow pinch-zooming.
        event.ctrlKey ||
        activeElement(ownerDocument(inputRef.current)) !== inputRef.current
      ) {
        return;
      }

      // Prevent the default behavior to avoid scrolling the page.
      event.preventDefault();
      allowInputSyncRef.current = true;

      const amount = getStepAmount(event);

      // Each wheel turn is a discrete, final change, so commit it immediately like keyboard
      // steps (gated on an actual change so boundary no-ops don't commit).
      const changed = incrementValue(amount, {
        direction: event.deltaY > 0 ? -1 : 1,
        event,
        reason: REASONS.wheel,
      });
      if (changed) {
        onValueCommitted(
          lastChangedValueRef.current,
          createGenericEventDetails(REASONS.wheel, event),
        );
      }
    }

    wheelCleanup = addEventListener(element, 'wheel', handleWheel);
  });

  onUnmounted(() => {
    wheelCleanup?.();
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const stateValue: NumberFieldRootState = {
      ...fieldState.value,
      disabled,
      readOnly,
      required,
      value: value.value as number | null,
      inputValue: inputValue.value,
      scrubbing: isScrubbing.value,
    };

    const contextValue: NumberFieldRootContext = {
      inputRef,
      minWithDefault,
      maxWithDefault,
      id,
      setValue,
      incrementValue,
      getStepAmount,
      allowInputSyncRef,
      formatOptionsRef,
      valueRef,
      lastChangedValueRef,
      hasPendingCommitRef,
      name,
      nameProp,
      inputMode: inputMode.value,
      getAllowedNonNumericKeys,
      min,
      max,
      setInputValue,
      locale,
      setIsScrubbing,
      state: stateValue,
      onValueCommitted,
    };

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: any = {};
    Object.assign(merged, elementProps, stateAttributes);
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

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: rootRef} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <div {...merged} ref={rootRef} />;
    }

    const hiddenInputProps = fieldContextRef.value.validation.getValidationProps(disabled, {
      onFocus() {
        inputRef.current?.focus();
      },
      onChange(event: any) {
        // Workaround for https://github.com/react/react/issues/9023
        if (event.nativeEvent?.defaultPrevented || disabled || readOnly) {
          return;
        }

        // Handle browser autofill.
        const nextValue = event.currentTarget.valueAsNumber;
        const parsedValue = Number.isNaN(nextValue) ? null : nextValue;
        const details = createChangeEventDetails(REASONS.none, event.nativeEvent);

        // `setValue` updates the dirty flag from the stored (clamped) value, so validate with
        // that same value rather than the raw autofilled one.
        setValue(parsedValue, details);
        formContextRef.value.clearErrors(name);
        fieldContextRef.value.validation.change(lastChangedValueRef.current ?? parsedValue);
      },
    });

    return (
      <NumberFieldRootContext.Provider value={contextValue as any}>
        {element}
        <input
          {...hiddenInputProps}
          ref={hiddenInputRef}
          type="number"
          form={form}
          name={name}
          value={value.value ?? ''}
          min={min}
          max={max}
          // stepMismatch validation is broken unless an explicit `min` is added.
          // See https://github.com/react/react/issues/12334.
          step={stepProp}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-hidden
          tabIndex={-1}
          style={name ? visuallyHiddenInput : visuallyHidden}
        />
      </NumberFieldRootContext.Provider>
    );
  };
}) as unknown as (props: NumberFieldRoot.Props) => JSX.Element;

export interface NumberFieldRootProps
  extends Omit<BaseUIComponentProps<'div', NumberFieldRootState>, 'onChange'> {
  /**
   * The id of the input element.
   */
  id?: string | undefined;
  /**
   * The minimum value of the input element.
   */
  min?: number | undefined;
  /**
   * The maximum value of the input element.
   */
  max?: number | undefined;
  /**
   * When true, direct text entry may be outside the `min`/`max` range without clamping,
   * so native range underflow/overflow validation can occur.
   * Step-based interactions (keyboard arrows, buttons, wheel, scrub) still clamp.
   * @default false
   */
  allowOutOfRange?: boolean | undefined;
  /**
   * The small step value of the input element when incrementing while the alt key is held.
   * Snaps to multiples of this value when `snapOnStep` is enabled.
   * @default 0.1
   */
  smallStep?: number | undefined;
  /**
   * Amount to increment and decrement with the buttons and arrow keys, or to scrub with pointer movement in the scrub area.
   * To always enable step validation on form submission, specify the `min` prop explicitly in conjunction with this prop.
   * Specify `step="any"` to always disable step validation; interactive stepping then uses a base amount of `1`, while the alt and shift keys still step by `smallStep` and `largeStep`.
   * @default 1
   */
  step?: number | 'any' | undefined;
  /**
   * The large step value of the input element when incrementing while the shift key is held.
   * Snaps to multiples of this value when `snapOnStep` is enabled.
   * @default 10
   */
  largeStep?: number | undefined;
  /**
   * Whether the user must enter a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to change the field value.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the number field is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The raw numeric value of the field.
   */
  value?: number | null | undefined;
  /**
   * The uncontrolled value of the field when it's initially rendered.
   *
   * To render a controlled number field, use the `value` prop instead.
   */
  defaultValue?: number | undefined;
  /**
   * Whether to allow the user to scrub the input value with the mouse wheel while focused and
   * hovering over the input.
   * @default false
   */
  allowWheelScrub?: boolean | undefined;
  /**
   * Whether the value should snap to the nearest step when incrementing or decrementing.
   * @default false
   */
  snapOnStep?: boolean | undefined;
  /**
   * Options to format the input value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Callback fired when the number value changes.
   *
   * The `eventDetails.reason` indicates what triggered the change:
   * - `'input-change'` for parseable typing or programmatic text updates
   * - `'input-clear'` when the field becomes empty
   * - `'input-blur'` when formatting (and clamping, if enabled) occurs on blur
   * - `'input-paste'` for paste interactions
   * - `'keyboard'` for arrow-key/Home/End stepping (typing digits uses `'input-change'`/`'input-clear'`)
   * - `'increment-press'` / `'decrement-press'` for button presses on the increment and decrement controls
   * - `'wheel'` for wheel-based scrubbing
   * - `'scrub'` for scrub area drags
   */
  onValueChange?:
    | ((value: number | null, eventDetails: NumberFieldRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Callback function that is fired when the value is committed.
   * It runs later than `onValueChange`, when:
   * - The input is blurred after typing a value.
   * - The pointer is released after scrubbing or pressing the increment/decrement buttons.
   *
   * It runs simultaneously with `onValueChange` when interacting with the keyboard or the
   * mouse wheel.
   *
   * **Warning**: This is a generic event not a change event.
   */
  onValueCommitted?:
    | ((value: number | null, eventDetails: NumberFieldRoot.CommitEventDetails) => void)
    | undefined;
  /**
   * The locale of the input element.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: ((instance: HTMLInputElement | null) => void) | {current: HTMLInputElement | null} | undefined;
}

export interface NumberFieldRootState extends FieldRootState {
  /**
   * The raw numeric value of the field.
   */
  value: number | null;
  /**
   * The formatted string value presented in the input element.
   */
  inputValue: string;
  /**
   * Whether the user must enter a value before submitting a form.
   */
  required: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to change the field value.
   */
  readOnly: boolean;
  /**
   * Whether the user is currently scrubbing the field.
   */
  scrubbing: boolean;
}

export type NumberFieldRootChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.inputClear
  | typeof REASONS.inputBlur
  | typeof REASONS.inputPaste
  | typeof REASONS.keyboard
  | typeof REASONS.incrementPress
  | typeof REASONS.decrementPress
  | typeof REASONS.wheel
  | typeof REASONS.scrub
  | typeof REASONS.none;
export type NumberFieldRootChangeEventDetails = BaseUIChangeEventDetails<
  NumberFieldRootChangeEventReason,
  ChangeEventCustomProperties
>;

// `none` is kept for consistency with other components even though the number field never
// commits with it.
export type NumberFieldRootCommitEventReason =
  | typeof REASONS.inputBlur
  | typeof REASONS.inputClear
  | typeof REASONS.keyboard
  | typeof REASONS.incrementPress
  | typeof REASONS.decrementPress
  | typeof REASONS.wheel
  | typeof REASONS.scrub
  | typeof REASONS.none;
export type NumberFieldRootCommitEventDetails =
  BaseUIGenericEventDetails<NumberFieldRoot.CommitEventReason>;

import type { ChangeEventCustomProperties } from '../utils/types';

export namespace NumberFieldRoot {
  export type State = NumberFieldRootState;
  export type Props = NumberFieldRootProps;
  export type ChangeEventReason = NumberFieldRootChangeEventReason;
  export type ChangeEventDetails = NumberFieldRootChangeEventDetails;
  export type CommitEventReason = NumberFieldRootCommitEventReason;
  export type CommitEventDetails = NumberFieldRootCommitEventDetails;
}

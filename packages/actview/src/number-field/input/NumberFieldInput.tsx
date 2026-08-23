import { defineComponent, ref, toValue, watch, useRootElement } from 'actview';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useValueChanged } from '@/internals/useValueChanged';
import { formatNumber } from '@/utils/formatNumber';
import { warn } from '@/utils/warn';
import type { BaseUIComponentProps } from '@/internals/types';
import {
  getNumberLocaleDetails,
  isNumeralChar,
  parseNumber,
  ANY_MINUS_RE,
  ANY_PLUS_RE,
  ANY_MINUS_DETECT_RE,
  ANY_PLUS_DETECT_RE,
  FORMAT_CONTROL_DETECT_RE,
} from '../utils/parse';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { hasNumberFormatRoundingOptions, removeFloatingPointErrors } from '../utils/validate';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

const NAVIGATE_KEYS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'Enter',
  'Escape',
]);

/**
 * The native input control in the number field.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export const NumberFieldInput = defineComponent(function (componentProps: NumberFieldInput.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useNumberFieldRootContext();
  const inputRef = useRootElement();

  const formContextRef = useFormContext();
  const fieldContextRef = useFieldRootContext();
  const labelableContextRef = useLabelableContext();

  const hasTouchedInputRef = {current: false};
  const blockRevalidationRef = {current: false};
  const pendingCaretRef = {current: null as number | null};

  const valueRef = rootContextRef.value.valueRef;

  useRegisterFieldControl(
    inputRef as any,
    rootContextRef.value.id,
    valueRef as any,
    undefined,
    !rootContextRef.value.state.disabled,
    rootContextRef.value.nameProp,
  );

  // After a paste splices text into the controlled value, the browser would otherwise drop the
  // caret at the end of the new value. Restore it just after the inserted text.
  watch(
    () => pendingCaretRef.current,
    () => {
      if (pendingCaretRef.current != null) {
        const caret = pendingCaretRef.current;
        pendingCaretRef.current = null;
        (inputRef.value as HTMLInputElement | null)?.setSelectionRange(caret, caret);
      }
    },
    {flush: 'post'},
  );

  useValueChanged(() => rootContextRef.value.state.value, () => {
    formContextRef.value.clearErrors(rootContextRef.value.name);

    if (blockRevalidationRef.current && !fieldContextRef.value.shouldValidateOnChange()) {
      blockRevalidationRef.current = false;
      return;
    }

    fieldContextRef.value.validation.change(rootContextRef.value.state.value);
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {
      allowInputSyncRef,
      formatOptionsRef,
      getAllowedNonNumericKeys,
      getStepAmount,
      id,
      incrementValue,
      inputMode,
      max,
      min,
      name,
      setValue,
      state,
      setInputValue,
      locale,
      onValueCommitted,
      lastChangedValueRef,
      hasPendingCommitRef,
    } = rootContextRef.value;

    const {disabled, readOnly, required, value, inputValue} = state;

    const {validationMode, setTouched, setFocused, invalid, validation} = fieldContextRef.value;
    const {labelId} = labelableContextRef.value;

    const inputProps: any = {
      id,
      required,
      disabled,
      readOnly,
      inputMode,
      value: inputValue,
      type: 'text',
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: 'false',
      'aria-roledescription': 'Number field',
      'aria-invalid': !disabled && invalid.value ? true : undefined,
      'aria-labelledby': labelId,
      onFocus(event: any) {
        // Read-only inputs are still focusable; only the value-changing handlers stay gated on it.
        if (event.defaultPrevented || disabled) {
          return;
        }

        fieldContextRef.value.setFocused(true);

        if (hasTouchedInputRef.current) {
          return;
        }

        hasTouchedInputRef.current = true;

        // Browsers set selection at the start of the input field by default. We want to set it at
        // the end for the first focus.
        const target = event.currentTarget;
        const length = target.value.length;
        target.setSelectionRange(length, length);
      },
      onBlur(event: any) {
        if (event.defaultPrevented || disabled) {
          return;
        }

        setTouched(true);
        setFocused(false);

        if (readOnly) {
          return;
        }

        const hadManualInput = !allowInputSyncRef.current;
        const hadPendingProgrammaticChange = hasPendingCommitRef.current;

        allowInputSyncRef.current = true;

        if (inputValue.trim() === '') {
          const clearDetails = createChangeEventDetails(REASONS.inputClear, event.nativeEvent);
          setValue(null, clearDetails);
          // Respect a canceled clear, mirroring the non-empty blur path below.
          if (clearDetails.isCanceled) {
            return;
          }
          if (validationMode.value === 'onBlur') {
            validation.commit(null);
          }
          // Don't report a commit when blurring an already-empty field that the user never
          // interacted with: nothing was cleared and no programmatic change is pending.
          if (hadManualInput || hadPendingProgrammaticChange || value !== null) {
            onValueCommitted(null, createGenericEventDetails(REASONS.inputClear, event.nativeEvent));
          }
          return;
        }

        const formatOptions = formatOptionsRef.current;
        const parsedValue = parseNumber(inputValue, locale, formatOptions);
        if (parsedValue === null) {
          return;
        }

        // Avoid applying Intl's default precision unless the format opts into rounding.
        const hasRoundingOptions = hasNumberFormatRoundingOptions(formatOptions);

        let committed: number | null;
        if (!hadManualInput && !hasRoundingOptions) {
          // No rounding options and no manual edit: the visible text is purely formatted
          // display, so keep the authoritative numeric value as-is rather than re-parsing the
          // rounded text and discarding precision.
          committed = value;
        } else if (hasRoundingOptions) {
          // Explicit rounding options apply to the committed value, whether typed or external.
          committed = removeFloatingPointErrors(parsedValue, formatOptions);
        } else {
          committed = parsedValue;
        }

        const nextEventDetails = createGenericEventDetails(REASONS.inputBlur, event.nativeEvent);
        const shouldUpdateValue = value !== committed;
        const shouldCommit = hadManualInput || shouldUpdateValue || hadPendingProgrammaticChange;

        // Use the stored value after `setValue` clamps it.
        let committedValue = committed;
        if (shouldUpdateValue) {
          const changeDetails = createChangeEventDetails(REASONS.inputBlur, event.nativeEvent);
          blockRevalidationRef.current = true;
          setValue(committed, changeDetails);
          if (changeDetails.isCanceled) {
            blockRevalidationRef.current = false;
            return;
          }
          committedValue = lastChangedValueRef.current;
          // If validation normalized back to the current value, `useValueChanged` won't fire to
          // reset the flag, so reset it here or the next external change won't revalidate.
          if (committedValue === value) {
            blockRevalidationRef.current = false;
          }
        }
        if (validationMode.value === 'onBlur') {
          validation.commit(committedValue);
        }
        if (shouldCommit) {
          onValueCommitted(committedValue, nextEventDetails);
        }

        // Normalize only the displayed text
        const canonicalText = formatNumber(committedValue, locale, formatOptions);
        if (inputValue !== canonicalText) {
          setInputValue(canonicalText);
        }
      },
      onChange(event: any) {
        // Workaround for https://github.com/react/react/issues/9023
        if (event.nativeEvent?.defaultPrevented) {
          return;
        }

        allowInputSyncRef.current = false;
        const targetValue = event.currentTarget.value;

        if (targetValue.trim() === '') {
          setInputValue(targetValue);
          setValue(null, createChangeEventDetails(REASONS.inputClear, event.nativeEvent));
          return;
        }

        // Update the input text immediately and only fire onValueChange if the typed value is
        // currently parseable into a number. This preserves good UX for IME
        // composition/partial input while still providing live numeric updates when possible.
        const allowedNonNumericKeys = getAllowedNonNumericKeys();
        const targetValueString = targetValue as string;
        const isValidCharacterString = Array.from(targetValueString).every(
          (ch: string) =>
            isNumeralChar(ch) ||
            ANY_MINUS_DETECT_RE.test(ch) ||
            allowedNonNumericKeys.has(ch) ||
            // Bidi/format controls are stripped by `parseNumber`; don't let them reject the string
            // (RTL locales insert them around exponent/currency signs, e.g. scientific notation).
            FORMAT_CONTROL_DETECT_RE.test(ch),
        );

        if (!isValidCharacterString) {
          return;
        }

        const parsedValue = parseNumber(targetValue, locale, formatOptionsRef.current);

        setInputValue(targetValue);

        if (parsedValue !== null) {
          setValue(parsedValue, createChangeEventDetails(REASONS.inputChange, event.nativeEvent));
        }
      },
      onKeyDown(event: any) {
        if (event.defaultPrevented || readOnly || disabled) {
          return;
        }

        const nativeEvent = event.nativeEvent ?? event;

        // Snapshot the dirty state without clearing it: navigation/allowed keys (ArrowLeft, Tab,
        // Enter, Escape, …) return early without changing the value, so marking the input synced
        // here would wrongly discard dirty-input authority. Only the value-changing branches below
        // mark it synced.
        const hadManualInput = !allowInputSyncRef.current;

        const allowedNonNumericKeys = getAllowedNonNumericKeys();

        let isAllowedNonNumericKey = allowedNonNumericKeys.has(event.key as string);

        const {decimal, currency, percentSign} = getNumberLocaleDetails(
          locale,
          formatOptionsRef.current,
        );

        const selectionStart = event.currentTarget.selectionStart;
        const selectionEnd = event.currentTarget.selectionEnd;
        const isAllSelected = selectionStart === 0 && selectionEnd === inputValue.length;

        const selectionContainsIndex = (index: number) =>
          selectionStart != null &&
          selectionEnd != null &&
          index >= selectionStart &&
          index < selectionEnd;

        // Only allow a single sign character: permit it when there is no existing sign of either
        // kind, when all text is selected, or when the selection covers the existing sign so it's
        // being replaced.
        const signGroups = [
          [ANY_MINUS_DETECT_RE, ANY_MINUS_RE],
          [ANY_PLUS_DETECT_RE, ANY_PLUS_RE],
        ] as const;
        signGroups.forEach(([detectRe, globalRe]) => {
          if (
            detectRe.test(event.key) &&
            Array.from(allowedNonNumericKeys).some((k) => detectRe.test(k))
          ) {
            const existingIndex = inputValue.search(globalRe);
            const isReplacingExisting = existingIndex !== -1 && selectionContainsIndex(existingIndex);
            isAllowedNonNumericKey =
              !(ANY_MINUS_DETECT_RE.test(inputValue) || ANY_PLUS_DETECT_RE.test(inputValue)) ||
              isAllSelected ||
              isReplacingExisting;
          }
        });

        // Only allow one of each symbol.
        [decimal, currency, percentSign].forEach((symbol) => {
          if ((event.key as string) === symbol) {
            const symbolIndex = inputValue.indexOf(symbol);
            const isSymbolHighlighted = selectionContainsIndex(symbolIndex);
            isAllowedNonNumericKey = symbolIndex === -1 || isAllSelected || isSymbolHighlighted;
          }
        });

        const isNavigateKey = NAVIGATE_KEYS.has(event.key);
        // Alt+ArrowUp/ArrowDown selects smallStep, so don't treat it as a bypass modifier.
        const isStepKey = event.key === 'ArrowUp' || event.key === 'ArrowDown';

        if (
          // Allow composition events (e.g., pinyin)
          event.which === 229 ||
          (event.altKey && !isStepKey) ||
          event.ctrlKey ||
          event.metaKey ||
          isAllowedNonNumericKey ||
          isNumeralChar(event.key) ||
          isNavigateKey
        ) {
          return;
        }

        // Home/End jump to the corresponding bound, but only when that bound is defined.
        let boundaryValue: number | null = null;
        if (event.key === 'Home' && min != null) {
          boundaryValue = min;
        } else if (event.key === 'End' && max != null) {
          boundaryValue = max;
        }

        // Let the browser handle multi-character keys we don't act on (PageUp, Insert, F-keys,
        // Home/End without min/max); invalid single characters are still blocked below.
        if (event.key.length > 1 && !isStepKey && boundaryValue === null) {
          return;
        }

        // Step from the authoritative numeric value unless the input has unsaved manual edits.
        // When the text is already synced, parsing the rounded display would collapse precision,
        // so pass no `currentValue` and let `incrementValue` fall back to the numeric state
        // (mirrors the button path).
        const currentValue = hadManualInput
          ? parseNumber(inputValue, locale, formatOptionsRef.current)
          : null;

        const amount = getStepAmount(event);

        // Prevent insertion of text or caret from moving.
        event.preventDefault();
        event.stopPropagation();

        const commitDetails = createGenericEventDetails(REASONS.keyboard, nativeEvent);

        let changed = false;
        if (isStepKey || boundaryValue !== null) {
          allowInputSyncRef.current = true;
        }
        if (isStepKey) {
          // When stepping from the synced numeric state, refresh the commit ref to the current
          // value so a canceled step can't commit a stale `lastChangedValueRef` left over from an
          // earlier change (mirrors the button path).
          if (!hadManualInput) {
            lastChangedValueRef.current = valueRef.current;
          }

          changed = incrementValue(amount, {
            direction: event.key === 'ArrowUp' ? 1 : -1,
            currentValue,
            event: nativeEvent,
            reason: REASONS.keyboard,
          });
        } else if (boundaryValue !== null) {
          changed = setValue(boundaryValue, createChangeEventDetails(REASONS.keyboard, nativeEvent));
        }

        // `changed` is only true when `setValue` applied the change, which records the stored
        // (clamped/snapped) value, so commit that rather than the pre-validation input.
        if (changed) {
          onValueCommitted(lastChangedValueRef.current, commitDetails);
        }
      },
      onPaste(event: any) {
        if (event.defaultPrevented || readOnly || disabled) {
          return;
        }

        let pastedData = '';

        try {
          pastedData = event.clipboardData?.getData('text/plain') ?? '';
        } catch {
          warn('<NumberField.Input> could not read clipboard text during paste handling.');
          return;
        }

        // Prevent `onChange` from being called.
        event.preventDefault();

        // Insert the pasted text at the caret/selection instead of replacing the entire value,
        // matching native input behavior (e.g. pasting "5" into "123|" yields "1235").
        const input = event.currentTarget;
        const selectionStart = input.selectionStart ?? 0;
        const selectionEnd = input.selectionEnd ?? 0;
        const nextText =
          inputValue.slice(0, selectionStart) + pastedData + inputValue.slice(selectionEnd);

        const parsedValue = parseNumber(nextText, locale, formatOptionsRef.current);

        if (parsedValue !== null) {
          allowInputSyncRef.current = false;
          pendingCaretRef.current = selectionStart + pastedData.length;
          setValue(parsedValue, createChangeEventDetails(REASONS.inputPaste, event.nativeEvent));
          setInputValue(nextText);
        }
      },
    };

    const stateAttributes = getStateAttributesProps(state, stateAttributesMapping);

    const merged: any = {};
    const validationProps = validation.getValidationProps(disabled, {});
    Object.assign(merged, inputProps, elementProps, validationProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(state);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: inputRef} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={inputRef} />;
    }
    return <input {...merged} ref={inputRef} />;
  };
}) as unknown as (props: NumberFieldInput.Props) => JSX.Element;

export interface NumberFieldInputState extends NumberFieldRootState {}

export interface NumberFieldInputProps
  extends BaseUIComponentProps<'input', NumberFieldInputState> {
  /**
   * A user-friendly description of the input's role for assistive tech. This is a role
   * description, not an accessible name — use `Field.Label` or `aria-label` to name the control.
   * @default 'Number field'
   */
  'aria-roledescription'?: string | undefined;
}

export namespace NumberFieldInput {
  export type State = NumberFieldInputState;
  export type Props = NumberFieldInputProps;
}

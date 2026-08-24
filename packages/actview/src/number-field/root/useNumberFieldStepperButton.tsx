import { defineComponent, ref, toValue } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import { isTouchLikePointerType, usePressAndHold } from '@/internals/usePressAndHold';
import { parseNumber } from '../utils/parse';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '@/internals/createBaseUIEventDetails';
import type { EventWithOptionalKeyState } from '../utils/types';
import type { NumberFieldRoot, NumberFieldRootState } from './NumberFieldRoot';
import { REASONS } from '@/internals/reasons';
import { useNumberFieldRootContext } from './NumberFieldRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

const SELECT_NONE_STYLE: any = {
  WebkitUserSelect: 'none',
  userSelect: 'none',
};

type StepperButtonProps = NativeButtonProps & BaseUIComponentProps<'button', NumberFieldRootState>;

/**
 * Shared implementation for the increment and decrement stepper buttons. They differ only in the
 * direction they step and the boundary (`max` vs `min`) at which they become disabled.
 */
export function useNumberFieldStepperButton(
  componentProps: StepperButtonProps,
  isIncrement: boolean,
) {
  const {
    disabled: disabledProp = false,
    nativeButton = true,
  } = componentProps as any;

  const rootContextRef = useNumberFieldRootContext();

  const {
    allowInputSyncRef,
    formatOptionsRef,
    getStepAmount,
    id,
    incrementValue,
    inputRef,
    maxWithDefault,
    minWithDefault,
    setValue,
    state,
    valueRef,
    locale,
    lastChangedValueRef,
    onValueCommitted,
  } = rootContextRef.value;
  const {disabled: contextDisabled, readOnly, value, inputValue} = state;

  const isAtBoundary = () =>
    value != null && (isIncrement ? value >= maxWithDefault : value <= minWithDefault);
  const disabled = disabledProp || contextDisabled || isAtBoundary();

  const pressReason: NumberFieldRoot.ChangeEventReason = isIncrement
    ? REASONS.incrementPress
    : REASONS.decrementPress;

  function commitValue(nativeEvent: MouseEvent) {
    const shouldCommitInputValue = !allowInputSyncRef.value;
    allowInputSyncRef.value = true;

    if (!shouldCommitInputValue) {
      // The input is already synced, so step from the authoritative numeric value rather than
      // re-parsing the rounded display text. Refresh the commit ref to the current value so a
      // subsequent canceled step can't commit a stale `lastChangedValueRef` left over from an
      // earlier change.
      lastChangedValueRef.value = valueRef.value;
      return;
    }

    // The input is dirty but not yet blurred, so the value won't have been committed.
    const parsedValue = parseNumber(inputValue, locale, formatOptionsRef.value);

    if (parsedValue !== null) {
      // Sync the dirty typed value with no direction so it isn't directionally snapped
      // (`snapOnStep`) before the real increment/decrement runs, which would otherwise emit a
      // spurious intermediate value.
      const details = createChangeEventDetails(pressReason, nativeEvent);
      setValue(parsedValue, details);

      // Only sync the ref base when the commit wasn't canceled, so a subsequent increment in the
      // same interaction steps from the value actually applied.
      if (!details.isCanceled) {
        valueRef.value = parsedValue;
      }
    }
  }

  const {pointerHandlers, shouldSkipClick} = usePressAndHold({
    disabled: disabled || readOnly,
    elementRef: inputRef,
    tick(triggerEvent) {
      const amount = getStepAmount(triggerEvent as EventWithOptionalKeyState);
      return incrementValue(amount, {
        direction: isIncrement ? 1 : -1,
        event: triggerEvent,
        reason: pressReason,
      });
    },
    onStop(nativeEvent: PointerEvent) {
      // `onStop` fires on every release; fall back to the current value when no tick changed it.
      // Step interactions never commit `null`, so the `??` can't mask a legitimate null commit.
      const committed = lastChangedValueRef.value ?? valueRef.value;
      onValueCommitted(committed, createGenericEventDetails(pressReason, nativeEvent));
    },
  });

  const {getButtonProps, buttonRef} = useButton({
    // Read-only steppers are exposed as unavailable through button disabled semantics, while
    // `data-readonly` (from `state`) is preserved for styling.
    disabled: disabled || readOnly,
    native: nativeButton,
    focusableWhenDisabled: true,
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const props: any = {
      disabled,
      'aria-label': isIncrement ? 'Increase' : 'Decrease',
      'aria-controls': id,
      // Keyboard users shouldn't have access to the buttons, since they can use the input element
      // to change the value. On the other hand, `aria-hidden` is not applied because touch screen
      // readers should be able to use the buttons.
      tabIndex: -1,
      style: SELECT_NONE_STYLE,
      ...pointerHandlers,
      onClick(event: any) {
        const isDisabled = disabled || readOnly;
        if (event.defaultPrevented || isDisabled || shouldSkipClick(event)) {
          return;
        }

        commitValue(event.nativeEvent);

        const amount = getStepAmount(event);

        const prev = valueRef.value;

        incrementValue(amount, {
          direction: isIncrement ? 1 : -1,
          event: event.nativeEvent,
          reason: pressReason,
        });

        const committed = lastChangedValueRef.value ?? valueRef.value;
        if (committed !== prev) {
          onValueCommitted(committed, createGenericEventDetails(pressReason, event.nativeEvent));
        }
      },
      onPointerDown(event: any) {
        if (event.defaultPrevented || readOnly || event.button || disabled) {
          return;
        }

        // Sync dirty input value before starting the hold sequence.
        commitValue(event.nativeEvent);
        // Treat `lastChangedValueRef` as a per-hold result slot. If the first tick is a no-op or is
        // canceled, `onStop` should fall back to the current value, not a previous interaction.
        lastChangedValueRef.value = null;

        if (!isTouchLikePointerType(event.pointerType)) {
          // Focus the input so the user can continue with keyboard interactions.
          inputRef.value?.focus();
        }

        pointerHandlers.onPointerDown(event);
      },
    };

    const buttonState = {...state, disabled};

    const stateAttributes = getStateAttributesProps(buttonState, stateAttributesMapping);

    const merged: any = {};
    // 注意：getButtonProps(merged) 必须在 props 合并后调用——函数式 getter 的
    // previousProps 语义（externalOnClick 从 merged 解构）。
    Object.assign(merged, props);
    Object.assign(merged, elementProps);
    Object.assign(merged, getButtonProps(merged));
    Object.assign(merged, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(buttonState);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, SELECT_NONE_STYLE, style(buttonState));
    } else if (style !== undefined) {
      merged.style = Object.assign({}, SELECT_NONE_STYLE, style);
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...buttonState, ref: buttonRef} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={buttonRef} />;
    }
    return <button {...merged} ref={buttonRef} />;
  };
}

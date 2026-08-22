import { computed } from 'actview';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useButton } from '@/internals/use-button';
import { isTouchLikePointerType, usePressAndHold } from '@/internals/usePressAndHold';
import { parseNumber } from '@/number-field/utils/parse';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '@/internals/createBaseUIEventDetails';
import type { DirectionalChangeReason, EventWithOptionalKeyState } from '@/number-field/utils/types';
import type { NumberFieldRoot, NumberFieldRootState } from '@/number-field/root/NumberFieldRoot';
import { REASONS } from '@/internals/reasons';
import { useNumberFieldRootContext } from '@/number-field/root/NumberFieldRootContext';
import { stateAttributesMapping } from '@/number-field/utils/stateAttributesMapping';

const SELECT_NONE_STYLE = {
  WebkitUserSelect: 'none',
  userSelect: 'none',
} as const;

type StepperButtonProps = NativeButtonProps & BaseUIComponentProps<'button', NumberFieldRootState>;

/**
 * Shared implementation for the increment and decrement stepper buttons. They differ only in the
 * direction they step and the boundary (`max` vs `min`) at which they become disabled.
 */
export function useNumberFieldStepperButton(
  componentProps: StepperButtonProps,
  isIncrement: boolean,
) {
  const rootContext = useNumberFieldRootContext();

  const contextDisabled = computed(() => rootContext.value.state.disabled);
  const readOnly = computed(() => rootContext.value.state.readOnly);
  const value = computed(() => rootContext.value.state.value);
  const inputValue = computed(() => rootContext.value.state.inputValue);

  const isAtBoundary = computed(() => {
    const currentValue = value.value;
    return (
      currentValue != null &&
      (isIncrement
        ? currentValue >= rootContext.value.maxWithDefault
        : currentValue <= rootContext.value.minWithDefault)
    );
  });

  const disabled = computed(
    () => (componentProps.disabled ?? false) || contextDisabled.value || isAtBoundary.value,
  );

  const pressReason: DirectionalChangeReason = isIncrement
    ? REASONS.incrementPress
    : REASONS.decrementPress;

  function commitValue(nativeEvent: MouseEvent) {
    const allowInputSyncRef = rootContext.value.allowInputSyncRef;
    const shouldCommitInputValue = !allowInputSyncRef.current;
    allowInputSyncRef.current = true;

    if (!shouldCommitInputValue) {
      // The input is already synced, so step from the authoritative numeric value rather than
      // re-parsing the rounded display text. Refresh the commit ref to the current value so a
      // subsequent canceled step can't commit a stale `lastChangedValueRef` left over from an
      // earlier change (the `setValue` that used to refresh it is now skipped on this path).
      rootContext.value.lastChangedValueRef.current = rootContext.value.valueRef.current;
      return;
    }

    // The input is dirty but not yet blurred, so the value won't have been committed.
    const parsedValue = parseNumber(
      inputValue.value,
      rootContext.value.locale,
      rootContext.value.formatOptionsRef.current,
    );

    if (parsedValue !== null) {
      // Sync the dirty typed value with no direction so it isn't directionally snapped
      // (`snapOnStep`) before the real increment/decrement runs, which would otherwise emit a
      // spurious intermediate value.
      const details = createChangeEventDetails(pressReason, nativeEvent);
      rootContext.value.setValue(parsedValue, details);

      // Only sync the ref base when the commit wasn't canceled, so a subsequent increment in the
      // same interaction steps from the value actually applied.
      if (!details.isCanceled) {
        rootContext.value.valueRef.current = parsedValue;
      }
    }
  }

  const { pointerHandlers, shouldSkipClick } = usePressAndHold({
    disabled: disabled.value || readOnly.value,
    elementRef: rootContext.value.inputRef,
    tick(triggerEvent) {
      const amount = rootContext.value.getStepAmount(triggerEvent as EventWithOptionalKeyState);
      return rootContext.value.incrementValue(amount, {
        direction: isIncrement ? 1 : -1,
        event: triggerEvent,
        reason: pressReason,
      });
    },
    onStop(nativeEvent: PointerEvent) {
      // `onStop` fires on every release; fall back to the current value when no tick changed it.
      // Step interactions never commit `null`, so the `??` can't mask a legitimate null commit.
      const committed =
        rootContext.value.lastChangedValueRef.current ?? rootContext.value.valueRef.current;
      rootContext.value.onValueCommitted(
        committed,
        createGenericEventDetails(pressReason, nativeEvent),
      );
    },
  });

  function getButtonElementProps() {
    const disabledValue = disabled.value;
    const readOnlyValue = readOnly.value;

    return {
      disabled: disabledValue,
      'aria-label': isIncrement ? 'Increase' : 'Decrease',
      'aria-controls': rootContext.value.id,
      // Keyboard users shouldn't have access to the buttons, since they can use the input element
      // to change the value. On the other hand, `aria-hidden` is not applied because touch screen
      // readers should be able to use the buttons.
      tabIndex: -1,
      style: SELECT_NONE_STYLE,
      ...pointerHandlers,
      onClick(event: MouseEvent) {
        const isDisabled = disabledValue || readOnlyValue;
        if (event.defaultPrevented || isDisabled || shouldSkipClick(event)) {
          return;
        }

        commitValue(event);

        const amount = rootContext.value.getStepAmount(event);

        const prev = rootContext.value.valueRef.current;

        rootContext.value.incrementValue(amount, {
          direction: isIncrement ? 1 : -1,
          event,
          reason: pressReason,
        });

        const committed =
          rootContext.value.lastChangedValueRef.current ?? rootContext.value.valueRef.current;
        if (committed !== prev) {
          rootContext.value.onValueCommitted(
            committed,
            createGenericEventDetails(pressReason, event),
          );
        }
      },
      onPointerDown(event: PointerEvent) {
        if (event.defaultPrevented || readOnlyValue || event.button || disabledValue) {
          return;
        }

        // Sync dirty input value before starting the hold sequence.
        commitValue(event);
        // Treat `lastChangedValueRef` as a per-hold result slot. If the first tick is a no-op or is
        // canceled, `onStop` should fall back to the current value, not a previous interaction.
        rootContext.value.lastChangedValueRef.current = null;

        if (!isTouchLikePointerType(event.pointerType)) {
          // Focus the input so the user can continue with keyboard interactions.
          rootContext.value.inputRef.current?.focus();
        }

        pointerHandlers.onPointerDown(event);
      },
    };
  }

  function getElementProps(prev: HTMLProps) {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      nativeButton: _nativeButton,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  }

  const { getButtonProps, buttonRef } = useButton({
    // Read-only steppers are exposed as unavailable through button disabled semantics, while
    // `data-readonly` (from `state`) is preserved for styling. `aria-readonly` isn't valid on the
    // `button` role, so it's intentionally not set.
    disabled: computed(() => disabled.value || readOnly.value),
    native: computed(() => componentProps.nativeButton ?? true),
    focusableWhenDisabled: true,
  });

  const buttonState = computed(() => ({ ...rootContext.value.state, disabled: disabled.value }));

  return useRenderElement('button', componentProps, {
    ref: [componentProps.ref, buttonRef],
    state: buttonState,
    props: [getButtonElementProps, getElementProps, getButtonProps],
    stateAttributesMapping,
  });
}

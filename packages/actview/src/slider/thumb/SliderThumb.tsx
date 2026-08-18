import { computed, ref, watch, onMounted, onUnmounted } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import { ownerWindow } from '@base-ui/actview-utils/owner';
import { clamp } from '@base-ui/actview-utils/clamp';
import { formatNumber } from '@base-ui/actview-utils/formatNumber';
import { contains } from '@base-ui/actview-utils/shadowDom';
import { script as prehydrationScript } from './prehydrationScript.min';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { mergeProps } from '../../merge-props';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useIsHydrating } from '../../utils/useIsHydrating';
import { useRenderElement } from '../../internals/useRenderElement';
import { valueToPercent } from '../../utils/valueToPercent';
import {
  ARROW_DOWN,
  ARROW_UP,
  ARROW_RIGHT,
  ARROW_LEFT,
  HOME,
  END,
  COMPOSITE_KEYS,
  PAGE_UP,
  PAGE_DOWN,
} from '../../internals/composite/composite';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { PrehydrationScript } from '../../internals/PrehydrationScript';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { matchesFocusVisible } from '../../floating-ui-actview/utils/element';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { getMidpoint } from '../utils/getMidpoint';
import { getSliderValue } from '../utils/getSliderValue';
import { getDecimalPrecision, roundValueToStep } from '../utils/roundValueToStep';
import type { SliderRootState } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';

const ALL_KEYS = new Set([...COMPOSITE_KEYS, PAGE_UP, PAGE_DOWN]);

function getDefaultAriaValueText(
  values: readonly number[],
  index: number,
  format: Intl.NumberFormatOptions | undefined,
  locale: Intl.LocalesArgument | undefined,
): string | undefined {
  if (index < 0) {
    return undefined;
  }

  if (values.length === 2) {
    return `${formatNumber(values[index], locale, format)} ${index === 0 ? 'start' : 'end'} range`;
  }

  return format ? formatNumber(values[index], locale, format) : undefined;
}

function getNewValue(
  thumbValue: number,
  increment: number,
  direction: number,
  min: number,
  max: number,
): number {
  const value = thumbValue + increment * direction;
  const roundedValue = Number(
    value.toFixed(
      Math.max(
        getDecimalPrecision(thumbValue),
        getDecimalPrecision(increment),
        getDecimalPrecision(min),
      ),
    ),
  );
  return clamp(roundedValue, min, max);
}

type StyleObject = Record<string, string | number | undefined>;

/**
 * The draggable part of the slider at the tip of the indicator.
 * Renders a `<div>` element and a nested `<input type="range">`.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderThumb(componentProps: SliderThumb.Props) {
  const id = useBaseUiId(componentProps.id);

  const ctx = useSliderRootContext();

  const {
    controlRef,
    handleInputChange,
    onValueCommitted,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    setActive,
    setIndicatorPosition,
    thumbRefs,
    validation,
  } = ctx.value;

  const direction = useDirection();
  const fieldContext = useFieldRootContext();

  const activeIndex = computed(() => ctx.value.active);
  const lastUsedThumbIndex = computed(() => ctx.value.lastUsedThumbIndex);
  const contextDisabled = computed(() => ctx.value.disabled);
  const sliderValues = computed(() => ctx.value.values);
  const inset = computed(() => ctx.value.inset);
  const labelId = computed(() => ctx.value.labelId);
  const largeStep = computed(() => ctx.value.largeStep);
  const locale = computed(() => ctx.value.locale);
  const min = computed(() => ctx.value.min);
  const max = computed(() => ctx.value.max);
  const minStepsBetweenValues = computed(() => ctx.value.minStepsBetweenValues);
  const form = computed(() => ctx.value.form);
  const name = computed(() => ctx.value.name);
  const orientation = computed(() => ctx.value.orientation);
  const renderBeforeHydration = computed(() => ctx.value.renderBeforeHydration);
  const step = computed(() => ctx.value.step);
  const format = computed(() => ctx.value.format);
  const state = computed(() => ctx.value.state);

  const disabled = computed(() => (componentProps.disabled ?? false) || contextDisabled.value);
  const range = computed(() => sliderValues.value.length > 1);
  const vertical = computed(() => orientation.value === 'vertical');
  const rtl = computed(() => direction.value === 'rtl');

  const thumbRef = { current: null as HTMLElement | null };
  const inputRef = { current: null as HTMLInputElement | null };
  const restoringFocusVisibleRef = { current: false };

  // Attached to the `input` (not the thumb wrapper) so `event.currentTarget` is the
  // input, matching `onKeyDown`. The synthetic blur/focus dispatched while restoring
  // `:focus-visible` is internal and must not be forwarded to the user's handlers.
  const handleFocusProp = (event: FocusEvent) => {
    if (restoringFocusVisibleRef.current) {
      return;
    }
    componentProps.onFocus?.(event);
  };

  const handleBlurProp = (event: FocusEvent) => {
    if (restoringFocusVisibleRef.current) {
      return;
    }
    componentProps.onBlur?.(event);
  };

  const defaultInputId = useBaseUiId();
  const labelableId = useLabelableId();
  const inputId = computed<string | undefined>(() =>
    range.value ? defaultInputId : (labelableId.value ?? undefined),
  );

  const thumbMetadata = computed(() => ({ inputId: inputId.value }));

  const { ref: listItemRef, index: compositeIndex } = useCompositeListItem<ThumbMetadata>({
    metadata: thumbMetadata.value,
  });

  const index = computed(() => (!range.value ? 0 : (componentProps.index ?? compositeIndex.value)));
  const last = computed(() => index.value === sliderValues.value.length - 1);
  const thumbValue = computed(() => sliderValues.value[index.value]);
  const thumbValuePercent = computed(() => valueToPercent(thumbValue.value, min.value, max.value));

  const positionPercent = ref<number | undefined>(undefined);
  const isHydrating = useIsHydrating();

  const safeLastUsedThumbIndex = computed(() => {
    const value = lastUsedThumbIndex.value;
    return value >= 0 && value < sliderValues.value.length ? value : -1;
  });

  const getInsetPosition = () => {
    const control = controlRef.current;
    const thumb = thumbRef.current;
    if (!control || !thumb) {
      return;
    }

    const thumbRect = thumb.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();

    const side = vertical.value ? 'height' : 'width';
    // the total travel distance adjusted to account for the thumb size
    const controlSize = controlRect[side] - thumbRect[side];
    // px distance from the starting edge (inline-start or bottom) to the thumb center
    const thumbOffsetFromControlEdge =
      thumbRect[side] / 2 + (controlSize * thumbValuePercent.value) / 100;
    const nextPositionPercent = (thumbOffsetFromControlEdge / controlRect[side]) * 100;
    const nextInsetPosition = Number.isFinite(nextPositionPercent)
      ? nextPositionPercent
      : undefined;

    positionPercent.value = nextInsetPosition;

    if (index.value === 0) {
      setIndicatorPosition((prevPosition) => [nextInsetPosition, prevPosition[1]]);
    } else if (last.value) {
      setIndicatorPosition((prevPosition) => [prevPosition[0], nextInsetPosition]);
    }
  };

  // ── Inset positioning ──────────────────────────────────────────────
  // Refactored from flush:'post'+immediate pattern (AI-001 workaround).
  // Initial setup in onMounted (DOM ready → refs populated, isConnected=true).
  // Changes handled by watch without immediate/flush:post.

  onMounted(() => {
    if (!inset.value) {
      return;
    }

    const control = controlRef.current;
    const thumb = thumbRef.current;
    if (!control || !thumb) {
      return;
    }

    // Direct call: DOM is already mounted, no layout pending.
    getInsetPosition();

    // ResizeObserver for dimension changes while inset is active.
    const ResizeObserverCtor = ownerWindow(control).ResizeObserver;
    if (typeof ResizeObserverCtor === 'function') {
      const ro = new ResizeObserverCtor(getInsetPosition);
      ro.observe(control);
      ro.observe(thumb);
      onUnmounted(() => ro.disconnect());
    }
  });

  watch(inset, (isInset) => {
    if (isInset) {
      queueMicrotask(getInsetPosition);
    }
  });

  watch([inset, thumbValuePercent], ([isInset]) => {
    if (isInset) {
      getInsetPosition();
    }
  });

  const startEdge = computed(() => (vertical.value ? 'bottom' : 'insetInlineStart'));
  const crossOffsetProperty = computed(() => (vertical.value ? 'left' : 'top'));

  const zIndex = computed(() => {
    let result: number | undefined;
    if (range.value) {
      if (activeIndex.value === index.value) {
        result = 2;
      } else if (safeLastUsedThumbIndex.value === index.value) {
        result = 1;
      }
    } else if (activeIndex.value === index.value) {
      result = 1;
    }
    return result;
  });

  const thumbStyle = computed<StyleObject>(() => {
    if (!inset.value && !Number.isFinite(thumbValuePercent.value)) {
      return visuallyHidden;
    }

    return {
      position: 'absolute',
      [startEdge.value]: inset.value ? 'var(--position)' : `${thumbValuePercent.value}%`,
      [crossOffsetProperty.value]: '50%',
      translate: `${(vertical.value || !rtl.value ? -1 : 1) * 50}% ${(vertical.value ? 1 : -1) * 50}%`,
      zIndex: zIndex.value,
      ...(inset.value && {
        '--position': `${positionPercent.value ?? 0}%`,
        visibility:
          (renderBeforeHydration.value && isHydrating) || positionPercent.value === undefined
            ? 'hidden'
            : undefined,
      }),
    };
  });

  const cssWritingMode = computed(() => {
    if (vertical.value) {
      return rtl.value ? 'vertical-rl' : 'vertical-lr';
    }
    return undefined;
  });

  const ariaLabel = computed(() =>
    typeof componentProps.getAriaLabel === 'function'
      ? componentProps.getAriaLabel(index.value)
      : componentProps['aria-label'],
  );

  const getInputProps = () => {
    const base: JSX.IntrinsicElements['input'] & { form?: string } = {
      'aria-label': ariaLabel.value,
      'aria-labelledby':
        componentProps['aria-labelledby'] ??
        (ariaLabel.value == null ? labelId.value : undefined),
      'aria-describedby': componentProps['aria-describedby'],
      'aria-orientation': orientation.value,
      'aria-valuenow': thumbValue.value,
      'aria-valuetext':
        typeof componentProps.getAriaValueText === 'function'
          ? componentProps.getAriaValueText(
              formatNumber(thumbValue.value, locale.value, format.value),
              thumbValue.value,
              index.value,
            )
          : (componentProps['aria-valuetext'] ??
            getDefaultAriaValueText(sliderValues.value, index.value, format.value, locale.value)),
      disabled: disabled.value,
      form: form.value,
      id: inputId.value,
      max: max.value,
      min: min.value,
      name: name.value,
      onChange(event) {
        handleInputChange((event.currentTarget as HTMLInputElement).valueAsNumber, index.value, event);
      },
      onFocus(event) {
        const isRestoringFocusVisible = restoringFocusVisibleRef.current;
        restoringFocusVisibleRef.current = false;
        setActive(index.value);
        fieldContext.value.setFocused(true);

        if (isRestoringFocusVisible) {
          event.stopPropagation();
        }
      },
      onBlur(event) {
        if (restoringFocusVisibleRef.current) {
          event.stopPropagation();
          return;
        }

        setActive(-1);

        // Keep field-level blur logic from running while focus moves to another thumb
        // of the same slider, so validation doesn't commit mid-interaction.
        if (
          thumbRefs.current.some((thumb) => contains(thumb, event.relatedTarget as Element | null))
        ) {
          return;
        }

        fieldContext.value.setTouched(true);
        fieldContext.value.setFocused(false);

        if (fieldContext.value.validationMode === 'onBlur') {
          validation.commit(
            getSliderValue(
              thumbValue.value,
              index.value,
              min.value,
              max.value,
              range.value,
              sliderValues.value,
            ),
          );
        }
      },
      onKeyDown(event) {
        if (event.defaultPrevented) {
          return;
        }

        if (!ALL_KEYS.has(event.key)) {
          return;
        }

        if (COMPOSITE_KEYS.has(event.key)) {
          event.stopPropagation();
        }

        let newValue: number | null = null;
        let directionValue = 0;
        let increment = event.shiftKey ? largeStep.value : step.value;
        const roundedValue = roundValueToStep(thumbValue.value, step.value, min.value);
        switch (event.key) {
          case ARROW_UP:
            directionValue = 1;
            break;
          case ARROW_RIGHT:
            directionValue = rtl.value ? -1 : 1;
            break;
          case ARROW_DOWN:
            directionValue = -1;
            break;
          case ARROW_LEFT:
            directionValue = rtl.value ? 1 : -1;
            break;
          case PAGE_UP:
            increment = largeStep.value;
            directionValue = 1;
            break;
          case PAGE_DOWN:
            increment = largeStep.value;
            directionValue = -1;
            break;
          case END:
            newValue =
              range.value && Number.isFinite(sliderValues.value[index.value + 1])
                ? sliderValues.value[index.value + 1] - step.value * minStepsBetweenValues.value
                : max.value;
            break;
          case HOME:
            newValue =
              range.value && Number.isFinite(sliderValues.value[index.value - 1])
                ? sliderValues.value[index.value - 1] + step.value * minStepsBetweenValues.value
                : min.value;
            break;
          default:
            break;
        }

        if (directionValue !== 0) {
          newValue = getNewValue(roundedValue, increment, directionValue, min.value, max.value);
        }

        if (newValue !== null) {
          const input = event.currentTarget as HTMLInputElement;

          if (!matchesFocusVisible(input)) {
            restoringFocusVisibleRef.current = true;
            input.blur();
            input.focus({
              preventScroll: true,
              // Show `:focus-visible` after keyboard interaction, even if the
              // thumb was previously focused by a pointer.
              focusVisible: true,
            });
          }

          handleInputChange(newValue, index.value, event);
          event.preventDefault();
        }
      },
      step: step.value,
      style: {
        ...visuallyHidden,
        // So that VoiceOver's focus indicator matches the thumb's dimensions
        width: '100%',
        height: '100%',
        ...(cssWritingMode.value !== undefined && { writingMode: cssWritingMode.value }),
      } as Record<string, string | number>,
      tabIndex: componentProps.tabIndex,
      type: 'range',
      value: thumbValue.value ?? '',
    };

    return mergeProps<'input'>(
      base,
      (props) => validation.getValidationProps(disabled.value, props),
      { onFocus: handleFocusProp, onBlur: handleBlurProp, onKeyDown: componentProps.onKeyDown },
    );
  };

  const mergedInputRef = useMergedRefs(inputRef, validation.inputRef, componentProps.inputRef);

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      children: _children,
      className: _className,
      'aria-describedby': _ariaDescribedBy,
      'aria-label': _ariaLabel,
      'aria-labelledby': _ariaLabelledBy,
      'aria-valuetext': _ariaValueText,
      disabled: _disabled,
      getAriaLabel: _getAriaLabel,
      getAriaValueText: _getAriaValueText,
      id: _id,
      index: _index,
      inputRef: _inputRef,
      onBlur: _onBlur,
      onFocus: _onFocus,
      onKeyDown: _onKeyDown,
      tabIndex: _tabIndex,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, listItemRef, thumbRef],
    props: [
      () => ({
        'data-index': index.value,
        children: (
          <>
            {componentProps.children}
            {/* mergeProps wraps handlers in WithBaseUIEvent; the native input element
                expects plain intrinsic handlers, so cast back to the intrinsic props. */}
            <input ref={mergedInputRef} {...(getInputProps() as JSX.IntrinsicElements['input'] & { form?: string })} />
            {/* Rendered with the last thumb to ensure all preceding thumbs are already in the DOM. */}
            {inset.value && last.value && renderBeforeHydration.value && (
              <PrehydrationScript script={prehydrationScript} />
            )}
          </>
        ),
        id,
        onPointerDown(event: PointerEvent) {
          // Keep disabled thumbs from writing transient pointer state.
          if (disabled.value) {
            return;
          }

          pressedThumbIndexRef.current = index.value;
          const midpoint = getMidpoint(event.currentTarget as HTMLElement, vertical.value);
          pressedThumbCenterOffsetRef.current =
            (vertical.value ? event.clientY : event.clientX) - midpoint;
        },
        style: thumbStyle.value as Record<string, string | number>,
      }),
      getElementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

export interface ThumbMetadata {
  inputId: string | undefined;
}

export interface SliderThumbState extends SliderRootState {}

export interface SliderThumbProps extends Omit<
  BaseUIComponentProps<'div', SliderThumbState>,
  'onBlur' | 'onFocus' | 'onKeyDown'
> {
  /**
   * Whether the thumb should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A string value forwarded to the [`aria-valuetext`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-valuetext) attribute of the `input`.
   * Ignored when `getAriaValueText` is provided.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * A function which returns a string value for the [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) attribute of the `input`.
   */
  getAriaLabel?: ((index: number) => string) | null | undefined;
  /**
   * A function which returns a string value for the [`aria-valuetext`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-valuetext) attribute of the `input`.
   * This is important for screen reader users.
   */
  getAriaValueText?:
    | ((formattedValue: string, value: number, index: number) => string)
    | null
    | undefined;
  /**
   * The index of the thumb which corresponds to the index of its value in the
   * `value` or `defaultValue` array.
   * This prop is required to support server-side rendering for range sliders
   * with multiple thumbs.
   * @example
   * ```tsx
   * <Slider.Root value={[10, 20]}>
   *   <Slider.Thumb index={0} />
   *   <Slider.Thumb index={1} />
   * </Slider.Root>
   * ```
   */
  index?: number | undefined;
  /**
   * A ref to access the nested input element.
   */
  inputRef?: ((instance: HTMLInputElement | null) => void) | { current?: HTMLInputElement | null; value?: HTMLInputElement | null } | null | undefined;
  /**
   * A blur handler forwarded to the `input`.
   */
  onBlur?: ((event: FocusEvent) => void) | undefined;
  /**
   * A focus handler forwarded to the `input`.
   */
  onFocus?: ((event: FocusEvent) => void) | undefined;
  /**
   * A keydown handler forwarded to the `input`.
   */
  onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /**
   * Optional tab index attribute forwarded to the `input`.
   */
  tabIndex?: number | undefined;
}

export namespace SliderThumb {
  export type State = SliderThumbState;
  export type Props = SliderThumbProps;
}

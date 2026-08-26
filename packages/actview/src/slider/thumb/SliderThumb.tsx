import { onUnmounted, ref, toValue, watch } from 'actview';
import { useMergedRefs } from '@/utils/useMergedRefs';
import { visuallyHidden } from '@/utils/visuallyHidden';
import { ownerWindow } from '@/utils/owner';
import { clamp } from '@/utils/clamp';
import { formatNumber } from '@/utils/formatNumber';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useIsHydrating } from '@/utils/useIsHydrating';
import { valueToPercent } from '@/utils/valueToPercent';
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
} from '@/internals/composite/composite';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { contains } from '@/utils/shadowDom';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { getMidpoint } from '../utils/getMidpoint';
import { getSliderValue } from '../utils/getSliderValue';
import { getDecimalPrecision, roundValueToStep } from '../utils/roundValueToStep';
import type { SliderRootState } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { Ref } from 'actview';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

const ALL_KEYS = new Set([...COMPOSITE_KEYS, PAGE_UP, PAGE_DOWN]);

function matchesFocusVisible(element: HTMLElement | null) {
  // JSDOM 不匹配 :focus-visible——恒 true（对齐 React 版 matchesFocusVisible 的 jsdom 分支）
  if (!element) {
    return true;
  }
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

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

/**
 * The draggable part of the slider at the tip of the indicator.
 * Renders a `<div>` element and a nested `<input type="range">`.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderThumb(componentProps: SliderThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const idProp = toValue(componentProps.id);
  const ariaDescribedByProp = toValue(componentProps['aria-describedby']);
  const ariaLabelProp = toValue(componentProps['aria-label']);
  const ariaLabelledByProp = toValue(componentProps['aria-labelledby']);
  const ariaValueTextProp = toValue(componentProps['aria-valuetext']);
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const getAriaLabelProp = componentProps.getAriaLabel;
  const getAriaValueTextProp = componentProps.getAriaValueText;
  const indexProp = toValue(componentProps.index);
  const inputRefProp = componentProps.inputRef as any;
  const onBlurProp = componentProps.onBlur;
  const onFocusProp = componentProps.onFocus;
  const onKeyDownProp = componentProps.onKeyDown;
  const tabIndexProp = toValue(componentProps.tabIndex);

  const id = useBaseUiId(idProp);

  const rootContextRef = useSliderRootContext();
  const {
    active: activeIndex,
    lastUsedThumbIndex,
    controlRef,
    disabled: contextDisabled,
    validation,
    format,
    handleInputChange,
    inset,
    labelId,
    largeStep,
    locale,
    max,
    min,
    minStepsBetweenValues,
    form,
    name,
    orientation,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    renderBeforeHydration,
    setActive,
    setIndicatorPosition,
    state,
    step,
    thumbRefs,
    values: sliderValues,
  } = rootContextRef.value;

  const direction = useDirection().value;

  const disabled = disabledProp || contextDisabled;
  const range = sliderValues.length > 1;
  const vertical = orientation === 'vertical';
  const rtl = direction === 'rtl';

  const {setTouched, setFocused, validationMode} = toValue(useFieldRootContext());

  const thumbRef = ref(null as HTMLElement | null);
  const inputRef = ref(null as HTMLInputElement | null);
  const restoringFocusVisibleRef = ref(false);

  const defaultInputId = useBaseUiId();
  const labelableId = useLabelableId();
  const inputId = range ? defaultInputId : labelableId;

  const thumbMetadata = {inputId};

  const {ref: listItemRef, index: compositeIndex} = useCompositeListItem<ThumbMetadata>({
    metadata: thumbMetadata,
  });

  const index = !range ? 0 : (indexProp ?? compositeIndex.value);
  const last = index === sliderValues.length - 1;
  const thumbValue = sliderValues[index];
  const thumbValuePercent = valueToPercent(thumbValue, min, max);

  const positionPercent = ref<number | undefined>(undefined);
  const isHydrating = useIsHydrating();

  const safeLastUsedThumbIndex =
    lastUsedThumbIndex >= 0 && lastUsedThumbIndex < sliderValues.length ? lastUsedThumbIndex : -1;

  const getInsetPosition = () => {
    const control = controlRef.value;
    const thumb = thumbRef.value;
    if (!control || !thumb) {
      return;
    }

    const thumbRect = thumb.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();

    const side = vertical ? 'height' : 'width';
    // the total travel distance adjusted to account for the thumb size
    const controlSize = controlRect[side] - thumbRect[side];
    // px distance from the starting edge (inline-start or bottom) to the thumb center
    const thumbOffsetFromControlEdge =
      thumbRect[side] / 2 + (controlSize * thumbValuePercent) / 100;
    const nextPositionPercent = (thumbOffsetFromControlEdge / controlRect[side]) * 100;
    const nextInsetPosition = Number.isFinite(nextPositionPercent)
      ? nextPositionPercent
      : undefined;

    positionPercent.value = nextInsetPosition;

    const currentIndicator = rootContextRef.value.indicatorPosition;
    if (index === 0) {
      setIndicatorPosition([nextInsetPosition, currentIndicator[1]]);
    } else if (last) {
      setIndicatorPosition([currentIndicator[0], nextInsetPosition]);
    }
  };

  // React 版 useIsoLayoutEffect ×3：inset 定位 + ResizeObserver
  watch(
    () => [inset, thumbValuePercent] as const,
    () => {
      if (inset) {
        queueMicrotask(getInsetPosition);
      }
    },
    {flush: 'post', immediate: true},
  );

  let resizeObserverCleanup: (() => void) | undefined;
  watch(
    () => [inset, controlRef.value, thumbRef.value] as const,
    () => {
      resizeObserverCleanup?.();
      resizeObserverCleanup = undefined;

      if (!inset) {
        return;
      }

      const control = controlRef.value;
      const thumb = thumbRef.value;

      if (!control || !thumb) {
        return;
      }

      const ResizeObserverCtor = ownerWindow(control).ResizeObserver;
      if (typeof ResizeObserverCtor !== 'function') {
        return;
      }

      const resizeObserver = new ResizeObserverCtor(getInsetPosition);

      resizeObserver.observe(control);
      resizeObserver.observe(thumb);

      resizeObserverCleanup = () => {
        resizeObserver.disconnect();
      };
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    resizeObserverCleanup?.();
  });

  const startEdge = vertical ? 'bottom' : 'insetInlineStart';
  const crossOffsetProperty = vertical ? 'left' : 'top';

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 渲染期逻辑（zIndex/thumbStyle/inputBase/merged/render 分支）在 IIFE 中执行
  return (
    <>
      {(() => {
        const {render, className, children: childrenProp, style, ...elementProps} =
          componentProps as any;

        let zIndex: number | undefined;
        if (range) {
          if (activeIndex === index) {
            zIndex = 2;
          } else if (safeLastUsedThumbIndex === index) {
            zIndex = 1;
          }
        } else if (activeIndex === index) {
          zIndex = 1;
        }

        let thumbStyle: Record<string, any>;
        if (!inset && !Number.isFinite(thumbValuePercent)) {
          thumbStyle = visuallyHidden;
        } else {
          thumbStyle = {
            position: 'absolute',
            [startEdge]: inset ? 'var(--position)' : `${thumbValuePercent}%`,
            [crossOffsetProperty]: '50%',
            translate: `${(vertical || !rtl ? -1 : 1) * 50}% ${(vertical ? 1 : -1) * 50}%`,
            zIndex,
            ...(inset && {
              ['--position' as string]: `${positionPercent.value ?? 0}%`,
              visibility:
                (renderBeforeHydration && isHydrating) || positionPercent.value === undefined
                  ? ('hidden' as const)
                  : undefined,
            }),
          };
        }

        let cssWritingMode: string | undefined;
        if (vertical) {
          cssWritingMode = rtl ? 'vertical-rl' : 'vertical-lr';
        }

        const ariaLabel =
          typeof getAriaLabelProp === 'function' ? getAriaLabelProp(index) : ariaLabelProp;

        const inputBase = {
          'aria-label': ariaLabel,
          'aria-labelledby': ariaLabelledByProp ?? (ariaLabel == null ? labelId : undefined),
          'aria-describedby': ariaDescribedByProp,
          'aria-orientation': orientation,
          'aria-valuenow': thumbValue,
          'aria-valuetext':
            typeof getAriaValueTextProp === 'function'
              ? getAriaValueTextProp(formatNumber(thumbValue, locale, format), thumbValue, index)
              : (ariaValueTextProp ?? getDefaultAriaValueText(sliderValues, index, format, locale)),
          disabled,
          form,
          id: inputId,
          max,
          min,
          name,
          onChange(event: any) {
            handleInputChange(event.currentTarget.valueAsNumber, index, event);
          },
          onFocus(event: any) {
            const isRestoringFocusVisible = restoringFocusVisibleRef.value;
            restoringFocusVisibleRef.value = false;
            setActive(index);
            setFocused(true);

            if (isRestoringFocusVisible) {
              event.stopPropagation();
            }
          },
          onBlur(event: any) {
            if (restoringFocusVisibleRef.value) {
              event.stopPropagation();
              return;
            }

            setActive(-1);

            // Keep field-level blur logic from running while focus moves to another thumb
            // of the same slider, so validation doesn't commit mid-interaction.
            if (thumbRefs.value.some((thumb) => contains(thumb, event.relatedTarget))) {
              return;
            }

            setTouched(true);
            setFocused(false);

            if (validationMode.value === 'onBlur') {
              validation.commit(getSliderValue(thumbValue, index, min, max, range, sliderValues));
            }
          },
          onKeyDown(event: any) {
            if (event.defaultPrevented) {
              return;
            }

            if (!ALL_KEYS.has(event.key)) {
              return;
            }

            if (COMPOSITE_KEYS.has(event.key)) {
              event.stopPropagation();
            }

            let newValue = null as number | null;
            let direction = 0;
            let increment = event.shiftKey ? largeStep : step;
            const roundedValue = roundValueToStep(thumbValue, step, min);
            switch (event.key) {
              case ARROW_UP:
                direction = 1;
                break;
              case ARROW_RIGHT:
                direction = rtl ? -1 : 1;
                break;
              case ARROW_DOWN:
                direction = -1;
                break;
              case ARROW_LEFT:
                direction = rtl ? 1 : -1;
                break;
              case PAGE_UP:
                increment = largeStep;
                direction = 1;
                break;
              case PAGE_DOWN:
                increment = largeStep;
                direction = -1;
                break;
              case END:
                newValue =
                  range && Number.isFinite(sliderValues[index + 1])
                    ? sliderValues[index + 1] - step * minStepsBetweenValues
                    : max;
                break;
              case HOME:
                newValue =
                  range && Number.isFinite(sliderValues[index - 1])
                    ? sliderValues[index - 1] + step * minStepsBetweenValues
                    : min;
                break;
              default:
                break;
            }

            if (direction !== 0) {
              newValue = getNewValue(roundedValue, increment, direction, min, max);
            }

            if (newValue !== null) {
              const input = event.currentTarget as HTMLInputElement;

              if (!matchesFocusVisible(input)) {
                restoringFocusVisibleRef.value = true;
                input.blur();
                input.focus({preventScroll: true});
              }

              handleInputChange(newValue, index, event);
              event.preventDefault();
            }
          },
          step,
          style: {
            ...visuallyHidden,
            // So that VoiceOver's focus indicator matches the thumb's dimensions
            width: '100%',
            height: '100%',
            writingMode: cssWritingMode,
          },
          tabIndex: tabIndexProp,
          type: 'range',
          value: thumbValue ?? '',
        };

        const mergedInputRef = useMergedRefs(
          inputRef as any,
          validation.inputRef as any,
          inputRefProp,
        );

        const merged = (): Record<string, any> => {
          const stateValue = toValue(state);
          const stateAttributes = getStateAttributesProps(stateValue, sliderStateAttributesMapping);

          const out: Record<string, any> = {};
          Object.assign(
            out,
            {
              ['data-index' as string]: index,
              id,
              onPointerDown(event: any) {
                // Keep disabled thumbs from writing transient pointer state.
                if (disabled) {
                  return;
                }

                pressedThumbIndexRef.value = index;
                const midpoint = getMidpoint(event.currentTarget, vertical);
                pressedThumbCenterOffsetRef.value =
                  (vertical ? event.clientY : event.clientX) - midpoint;
              },
              style: thumbStyle,
            },
            elementProps,
            stateAttributes,
          );

          const validationProps = validation.getValidationProps(disabled, out);
          Object.assign(out, validationProps);

          if (typeof className === 'function') {
            out.className = className(stateValue);
          } else if (className !== undefined) {
            out.className = className;
          }
          if (typeof style === 'function') {
            out.style = Object.assign({}, thumbStyle, style(stateValue));
          }

          out.children = (
            <>
              {childrenProp}
              <input ref={mergedInputRef} {...(inputBase as any)} />
            </>
          );
          return out;
        };

        if (render) {
          const out = merged();
          if (typeof render === 'function') {
            return render({...out, ...toValue(state), ref: rootRef} as any);
          }
          const renderProps = render.props ?? {};
          const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
          const Tag = render.type as any;
          const mergedRenderProps = Object.assign({}, out, restRenderProps);
          mergedRenderProps.className =
            typeof out.className === 'string' && typeof renderClassName === 'string'
              ? `${out.className} ${renderClassName}`.trim()
              : (out.className ?? renderClassName);
          mergedRenderProps.style = Object.assign({}, out.style, renderStyle);
          return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
        }
        return <div {...merged()} ref={rootRef} />;
      })()}
    </>
  );
}

export interface ThumbMetadata {
  inputId: string | undefined;
}

export interface SliderThumbState extends SliderRootState {}

export interface SliderThumbProps
  extends Omit<BaseUIComponentProps<'div', SliderThumbState>, 'onBlur' | 'onFocus' | 'onKeyDown'> {
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
  inputRef?: Ref<HTMLInputElement | null> | ((element: HTMLInputElement | null) => void) | undefined;
  /**
   * A blur handler forwarded to the `input`.
   */
  onBlur?: ((event: any) => void) | undefined;
  /**
   * A focus handler forwarded to the `input`.
   */
  onFocus?: ((event: any) => void) | undefined;
  /**
   * A keydown handler forwarded to the `input`.
   */
  onKeyDown?: ((event: any) => void) | undefined;
  /**
   * Optional tab index attribute forwarded to the `input`.
   */
  tabIndex?: number | undefined;
}

export namespace SliderThumb {
  export type State = SliderThumbState;
  export type Props = SliderThumbProps;
}

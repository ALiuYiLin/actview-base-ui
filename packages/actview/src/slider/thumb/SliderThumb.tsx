import { computed, onUnmounted, ref, toRefs, watch } from 'actview';
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
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

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
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：⚠️ 不解构载体（解构捕获快照）——
  // computed/handler 内一律 rootContext.X 属性访问。
  const rootContext = useSliderRootContext();

  const direction = useDirection().value;

  const disabled = computed(
    () => (componentProps.disabled ?? false) || rootContext.disabled,
  );
  const range = computed(() => rootContext.values.length > 1);
  const vertical = computed(() => rootContext.orientation === 'vertical');
  const rtl = direction === 'rtl';

  const {setTouched, setFocused, validationMode} = useFieldRootContext();

  const thumbRef = ref(null as HTMLElement | null);
  const inputRef = ref(null as HTMLInputElement | null);
  const restoringFocusVisibleRef = ref(false);

  const defaultInputId = useBaseUiId();
  const labelableId = useLabelableId();
  const inputId = computed(() => (range.value ? defaultInputId : labelableId));

  const thumbMetadata = computed(() => ({inputId: inputId.value}));

  const {ref: listItemRef, index: compositeIndex} = useCompositeListItem<ThumbMetadata>({
    metadata: thumbMetadata.value,
  });

  const index = computed(() =>
    !range.value ? 0 : (componentProps.index ?? compositeIndex.value),
  );
  const last = computed(() => index.value === rootContext.values.length - 1);
  const thumbValue = computed(() => rootContext.values[index.value]);
  const thumbValuePercent = computed(() =>
    valueToPercent(thumbValue.value, rootContext.min, rootContext.max),
  );

  const positionPercent = ref<number | undefined>(undefined);
  const isHydrating = useIsHydrating();

  const safeLastUsedThumbIndex = computed(() => {
    const v = rootContext.lastUsedThumbIndex;
    return v >= 0 && v < rootContext.values.length ? v : -1;
  });

  const getInsetPosition = () => {
    const control = rootContext.controlRef.value;
    const thumb = thumbRef.value;
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

    const currentIndicator = rootContext.indicatorPosition;
    if (index.value === 0) {
      rootContext.setIndicatorPosition([nextInsetPosition, currentIndicator[1]]);
    } else if (last.value) {
      rootContext.setIndicatorPosition([currentIndicator[0], nextInsetPosition]);
    }
  };

  // React 版 useIsoLayoutEffect ×3：inset 定位 + ResizeObserver
  watch(
    () => [rootContext.inset, thumbValuePercent.value] as const,
    () => {
      if (rootContext.inset) {
        queueMicrotask(getInsetPosition);
      }
    },
    {flush: 'post', immediate: true},
  );

  let resizeObserverCleanup: (() => void) | undefined;
  watch(
    () => [rootContext.inset, rootContext.controlRef.value, thumbRef.value] as const,
    () => {
      resizeObserverCleanup?.();
      resizeObserverCleanup = undefined;

      if (!rootContext.inset) {
        return;
      }

      const control = rootContext.controlRef.value;
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

  const startEdge = computed(() => (vertical.value ? 'bottom' : 'insetInlineStart'));
  const crossOffsetProperty = vertical.value ? 'left' : 'top';

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  // 值形 props toRefs 活引用；children 不解构（input 子元素在 rootProps 注入）。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<SliderThumbState>(() => rootContext.state);

  const zIndex = computed<number | undefined>(() => {
    if (range.value) {
      if (rootContext.active === index.value) {
        return 2;
      }
      if (safeLastUsedThumbIndex.value === index.value) {
        return 1;
      }
      return undefined;
    }
    return rootContext.active === index.value ? 1 : undefined;
  });

  const thumbStyle = computed<Record<string, any>>(() => {
    if (!rootContext.inset && !Number.isFinite(thumbValuePercent.value)) {
      return visuallyHidden;
    }
    return {
      position: 'absolute',
      [startEdge.value]: rootContext.inset ? 'var(--position)' : `${thumbValuePercent.value}%`,
      [crossOffsetProperty]: '50%',
      translate: `${(vertical.value || !rtl ? -1 : 1) * 50}% ${(vertical.value ? 1 : -1) * 50}%`,
      zIndex: zIndex.value,
      ...(rootContext.inset && {
        ['--position' as string]: `${positionPercent.value ?? 0}%`,
        visibility:
          (rootContext.renderBeforeHydration && isHydrating) || positionPercent.value === undefined
            ? ('hidden' as const)
            : undefined,
      }),
    };
  });

  const cssWritingMode = computed(() =>
    vertical.value ? (rtl ? 'vertical-rl' : 'vertical-lr') : undefined,
  );

  const ariaLabel = computed(() =>
    typeof componentProps.getAriaLabel === 'function'
      ? componentProps.getAriaLabel(index.value)
      : componentProps['aria-label'],
  );

  const inputBase = computed<Record<string, any>>(() => ({
    'aria-label': ariaLabel.value,
    'aria-labelledby':
      componentProps['aria-labelledby'] ?? (ariaLabel.value == null ? rootContext.labelId : undefined),
    'aria-describedby': componentProps['aria-describedby'],
    'aria-orientation': rootContext.orientation,
    'aria-valuenow': thumbValue.value,
    'aria-valuetext':
      typeof componentProps.getAriaValueText === 'function'
        ? componentProps.getAriaValueText(
            formatNumber(thumbValue.value, rootContext.locale, rootContext.format),
            thumbValue.value,
            index.value,
          )
        : (componentProps['aria-valuetext'] ??
          getDefaultAriaValueText(rootContext.values, index.value, rootContext.format, rootContext.locale)),
    disabled: disabled.value,
    form: rootContext.form,
    id: inputId.value,
    max: rootContext.max,
    min: rootContext.min,
    name: rootContext.name,
    onChange(event: any) {
      rootContext.handleInputChange(event.currentTarget.valueAsNumber, index.value, event);
    },
    onFocus(event: any) {
      const isRestoringFocusVisible = restoringFocusVisibleRef.value;
      restoringFocusVisibleRef.value = false;
      rootContext.setActive(index.value);
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

      rootContext.setActive(-1);

      // Keep field-level blur logic from running while focus moves to another thumb
      // of the same slider, so validation doesn't commit mid-interaction.
      if (rootContext.thumbRefs.value.some((thumb) => contains(thumb, event.relatedTarget))) {
        return;
      }

      setTouched(true);
      setFocused(false);

      if (validationMode.value === 'onBlur') {
        rootContext.validation.commit(
          getSliderValue(
            thumbValue.value,
            index.value,
            rootContext.min,
            rootContext.max,
            range.value,
            rootContext.values,
          ),
        );
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
      let keyDirection = 0;
      let increment = event.shiftKey ? rootContext.largeStep : rootContext.step;
      const roundedValue = roundValueToStep(thumbValue.value, rootContext.step, rootContext.min);
      switch (event.key) {
        case ARROW_UP:
          keyDirection = 1;
          break;
        case ARROW_RIGHT:
          keyDirection = rtl ? -1 : 1;
          break;
        case ARROW_DOWN:
          keyDirection = -1;
          break;
        case ARROW_LEFT:
          keyDirection = rtl ? 1 : -1;
          break;
        case PAGE_UP:
          increment = rootContext.largeStep;
          keyDirection = 1;
          break;
        case PAGE_DOWN:
          increment = rootContext.largeStep;
          keyDirection = -1;
          break;
        case END:
          newValue =
            range.value && Number.isFinite(rootContext.values[index.value + 1])
              ? rootContext.values[index.value + 1] - rootContext.step * rootContext.minStepsBetweenValues
              : rootContext.max;
          break;
        case HOME:
          newValue =
            range.value && Number.isFinite(rootContext.values[index.value - 1])
              ? rootContext.values[index.value - 1] + rootContext.step * rootContext.minStepsBetweenValues
              : rootContext.min;
          break;
        default:
          break;
      }

      if (keyDirection !== 0) {
        newValue = getNewValue(
          roundedValue,
          increment,
          keyDirection,
          rootContext.min,
          rootContext.max,
        );
      }

      if (newValue !== null) {
        const input = event.currentTarget as HTMLInputElement;

        if (!matchesFocusVisible(input)) {
          restoringFocusVisibleRef.value = true;
          input.blur();
          input.focus({preventScroll: true});
        }

        rootContext.handleInputChange(newValue, index.value, event);
        event.preventDefault();
      }
    },
    step: rootContext.step,
    style: {
      ...visuallyHidden,
      // So that VoiceOver's focus indicator matches the thumb's dimensions
      width: '100%',
      height: '100%',
      writingMode: cssWritingMode.value,
    },
    tabIndex: componentProps.tabIndex,
    type: 'range',
    value: thumbValue.value ?? '',
  }));

  const mergedInputRef = computed(() =>
    useMergedRefs(
      inputRef as any,
      rootContext.validation.inputRef as any,
      componentProps.inputRef as any,
    ),
  );

  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = state.value;
    const stateAttributes = getStateAttributesProps(stateValue, sliderStateAttributesMapping);

    const out: Record<string, any> = Object.assign(
      {
        ['data-index' as string]: index.value,
        id: useBaseUiId(componentProps.id),
        onPointerDown(event: any) {
          // Keep disabled thumbs from writing transient pointer state.
          if (disabled.value) {
            return;
          }

          rootContext.pressedThumbIndexRef.value = index.value;
          const midpoint = getMidpoint(event.currentTarget, vertical.value);
          rootContext.pressedThumbCenterOffsetRef.value =
            (vertical.value ? event.clientY : event.clientX) - midpoint;
        },
        style: thumbStyle.value,
      },
      elementProps.value,
      stateAttributes,
    );

    const validationProps = rootContext.validation.getValidationProps(disabled.value, out);
    Object.assign(out, validationProps);

    if (typeof className?.value === 'function') {
      out.className = (className.value as any)(stateValue);
    } else if (className?.value !== undefined) {
      out.className = className.value;
    }
    if (typeof style?.value === 'function') {
      out.style = Object.assign({}, thumbStyle.value, (style.value as any)(stateValue));
    }

    out.children = (
      <>
        {elementRefs.children?.value}
        <input ref={mergedInputRef.value} {...(inputBase.value as any)} />
      </>
    );
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: sliderStateAttributesMapping,
          ref: useMergedRefs(
            rootRef as any,
            (el: HTMLElement | null) => {
              listItemRef(el);
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
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

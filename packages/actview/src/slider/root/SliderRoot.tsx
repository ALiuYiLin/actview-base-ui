import {computed, rawRef, ref, toValue, watch, shallowRef, toRefs, unrefs} from 'actview';
import type { ComputedRef } from 'actview';
import { ownerDocument } from '@/utils/owner';
import { useControlled } from '@/utils/useControlled';
import { warn } from '@/utils/warn';
import { clamp } from '@/utils/clamp';
import { areArraysEqual } from '@/utils/areArraysEqual';
import type { BaseUIComponentProps, Orientation } from '@/internals/types';
import { createChangeEventDetails, createGenericEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails, BaseUIGenericEventDetails } from '@/internals/createBaseUIEventDetails';
import { useValueChanged } from '@/internals/useValueChanged';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { activeElement, contains } from '@/utils/shadowDom';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { resolveAriaLabelledBy, getDefaultLabelId } from '@/utils/resolveAriaLabelledBy';
import { asc } from '../utils/asc';
import { getSliderValue } from '../utils/getSliderValue';
import { validateMinimumDistance } from '../utils/validateMinimumDistance';
import type { ThumbMetadata } from '../thumb/SliderThumb';
import { sliderStateAttributesMapping } from './stateAttributesMapping';
import { SliderRootContext } from './SliderRootContext';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';

function areValuesEqual(
  newValue: number | readonly number[],
  oldValue: number | readonly number[],
) {
  return (
    newValue === oldValue ||
    (Array.isArray(newValue) && Array.isArray(oldValue) && areArraysEqual(newValue, oldValue))
  );
}

/**
 * Groups all parts of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderRoot<Value extends number | readonly number[]>(
  componentProps: SliderRoot.Props<Value>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {
    disabled: disabledProp = false,
    largeStep = 10,
    max = 100,
    min = 0,
    minStepsBetweenValues = 0,
    orientation = 'horizontal',
    step = 1,
    thumbCollisionBehavior = 'push',
    thumbAlignment = 'center',
  } = componentProps;

  const idProp = toValue(componentProps.id);
  const ariaLabelledByProp = toValue(componentProps['aria-labelledby']);
  const format = toValue(componentProps.format);
  const locale = toValue(componentProps.locale);
  const form = toValue(componentProps.form);
  const nameProp = toValue(componentProps.name);
  const defaultValue = toValue(componentProps.defaultValue);
  const valueProp = toValue(componentProps.value);
  const onValueChangeProp = componentProps.onValueChange;
  const onValueCommittedProp = componentProps.onValueCommitted;

  const id = useBaseUiId(idProp);
  const defaultLabelId = getDefaultLabelId(id);
  const onValueChange = onValueChangeProp as unknown as (
    value: number | number[],
    eventDetails: SliderRoot.ChangeEventDetails,
  ) => void;
  const onValueCommitted = onValueCommittedProp as unknown as (
    value: number | readonly number[],
    eventDetails: SliderRoot.CommitEventDetails,
  ) => void;

  const {clearErrors} = toValue(useFormContext());
  const {
    state: fieldState,
    disabled: fieldDisabled,
    name: fieldName,
    setTouched,
    setDirty,
    validityData,
    validation,
  } = toValue(useFieldRootContext());
  const {labelId: fieldLabelId} = toValue(useLabelableContext());
  const labelId = ref<string | undefined>(undefined);

  const ariaLabelledby = computed(
    () =>
      (ariaLabelledByProp as string | undefined) ??
      resolveAriaLabelledBy(fieldLabelId.value, labelId.value),
  );
  const disabled = fieldDisabled.value || disabledProp;
  const name = fieldName.value ?? nameProp;

  // The internal value is potentially unsorted, e.g. to support frozen arrays
  // https://github.com/mui/material-ui/pull/28472
  const [valueUnwrapped, setValueUnwrapped] = useControlled<number | readonly number[]>({
    controlled: valueProp,
    default: (defaultValue ?? min) as number | readonly number[],
    name: 'Slider',
  });

  const sliderRef = ref(null as HTMLElement | null);
  const controlRef = ref(null as HTMLElement | null);
  const thumbRefs = shallowRef([] as (HTMLElement | null)[]);
  // The px distance between the pointer and the center of a pressed thumb.
  const pressedThumbCenterOffsetRef = ref(null as number | null);
  // The index of the pressed thumb, or the closest thumb if the `Control` was pressed.
  // This is updated on pointerdown, which is sooner than the `active/activeIndex`
  // state which is updated later when the nested `input` receives focus.
  const pressedThumbIndexRef = ref(-1);
  // The values when the current drag interaction started.
  const pressedValuesRef = ref(null as readonly number[] | null);
  const lastChangeReasonRef = ref(REASONS.none as SliderRoot.ChangeEventReason);

  // We can't use the :active browser pseudo-classes.
  // - The active state isn't triggered when clicking on the rail.
  // - The active state isn't transferred when inversing a range slider.
  const active = ref(-1);
  const lastUsedThumbIndex = ref(-1);
  const dragging = ref(false);
  const thumbMap = ref(new Map<Node, CompositeMetadata<ThumbMetadata>>());
  const indicatorPosition = ref<(number | undefined)[]>([undefined, undefined]);

  const setActive = (value: number) => {
    active.value = value;

    if (value !== -1) {
      lastUsedThumbIndex.value = value;
    }
  };

  const registerFieldControlRef = (element: HTMLElement | null) => {
    if (element) {
      controlRef.value = element;
    }
  };

  const range = computed(() => Array.isArray(valueUnwrapped.value));

  const values = computed(() => {
    if (!range.value) {
      return [clamp(valueUnwrapped.value as number, min, max)];
    }
    return (valueUnwrapped.value as readonly number[]).map((v) => clamp(v, min, max)).sort(asc);
  });

  const fieldValue = computed(() => (range.value ? values.value : values.value[0]));

  useRegisterFieldControl(
    validation.inputRef,
    id,
    fieldValue.value,
    undefined,
    !disabled,
    nameProp,
  );

  useValueChanged(() => fieldValue.value, () => {
    clearErrors(name);

    validation.change(fieldValue.value);

    const initialValue = validityData.value.initialValue as
      | number
      | readonly number[]
      | undefined;
    let isDirty: boolean;
    if (Array.isArray(fieldValue.value) && Array.isArray(initialValue)) {
      isDirty = !areArraysEqual(fieldValue.value, initialValue);
    } else {
      isDirty = fieldValue.value !== initialValue;
    }
    setDirty(isDirty);
  });

  const setValue = (
    newValue: number | number[],
    details: SliderRoot.ChangeEventDetails,
  ) => {
    if (Number.isNaN(newValue) || areValuesEqual(newValue, valueUnwrapped.value as number | number[])) {
      return false;
    }

    // Redefine target to allow name and value to be read.
    // This allows seamless integration with the most popular form libraries.
    // https://github.com/mui/material-ui/issues/13485#issuecomment-676048492
    // Clone the event to not override `target` of the original event.
    const nativeEvent = details.event as any;
    const EventConstructor = nativeEvent.constructor as typeof Event;
    const clonedEvent = new EventConstructor(nativeEvent.type, nativeEvent);

    Object.defineProperty(clonedEvent, 'target', {
      writable: true,
      value: {value: newValue, name},
    });

    (details as any).event = clonedEvent;

    onValueChange?.(newValue, details);

    if (details.isCanceled) {
      return false;
    }

    lastChangeReasonRef.value = details.reason;

    setValueUnwrapped(newValue as Value);

    return true;
  };

  const handleInputChange = (
    valueInput: number,
    index: number,
    event: any,
  ) => {
    const newValue = getSliderValue(valueInput, index, min, max, range.value, values.value);

    if (validateMinimumDistance(newValue, step, minStepsBetweenValues)) {
      const reason = 'key' in event ? REASONS.keyboard : REASONS.inputChange;
      const applied = setValue(
        newValue,
        createChangeEventDetails(reason, event as any, undefined, {
          activeThumbIndex: index,
        }),
      );
      setTouched(true);

      if (applied) {
        onValueCommitted?.(newValue, createGenericEventDetails(reason, event as any));
      }
    }
  };

  /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
  if (process.env.NODE_ENV !== 'production') {
    if (min >= max) {
      warn('Slider `max` must be greater than `min`.');
    }
  }

  // React 版 useIsoLayoutEffect：disabled 时移除焦点 + 清除 active
  watch(
    () => [disabled, active.value] as const,
    ([disabledValue, activeValue]) => {
      if (!disabledValue) {
        return;
      }

      const activeEl = activeElement(ownerDocument(sliderRef.value));
      if (contains(sliderRef.value, activeEl)) {
        // This is necessary because Firefox and Safari will keep focus
        // on a disabled element:
        // https://codesandbox.io/p/sandbox/mui-pr-22247-forked-h151h?file=/src/App.js
        (activeEl as HTMLElement).blur();
      }

      if (activeValue !== -1) {
        active.value = -1;
      }
    },
    {flush: 'post', immediate: true},
  );

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateValueFn = (): SliderRootState => ({
    ...fieldState.value,
    activeThumbIndex: active.value,
    disabled,
    dragging: dragging.value,
    orientation,
    max,
    min,
    minStepsBetweenValues,
    step,
    values: values.value,
  });

  const buildContextValue = (stateValue: SliderRootState): SliderRootContext => ({
    active: active.value,
    controlRef,
    disabled,
    dragging: dragging.value,
    validation,
    format,
    handleInputChange,
    indicatorPosition: indicatorPosition.value,
    inset: thumbAlignment !== 'center',
    labelId: ariaLabelledby.value,
    rootLabelId: defaultLabelId,
    largeStep,
    lastUsedThumbIndex: lastUsedThumbIndex.value,
    lastChangeReasonRef,
    form,
    locale,
    max,
    min,
    minStepsBetweenValues,
    name,
    onValueCommitted,
    orientation,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    pressedValuesRef,
    registerFieldControlRef,
    renderBeforeHydration: thumbAlignment === 'edge',
    setActive,
    setDragging: (v: boolean) => (dragging.value = v),
    setIndicatorPosition: (v: (number | undefined)[]) => (indicatorPosition.value = v),
    setLabelId: (v: string | undefined) => (labelId.value = v),
    setValue,
    state: stateValue,
    step,
    thumbCollisionBehavior,
    thumbMap: thumbMap.value,
    thumbRefs,
    values: values.value,
  });

  const {element} = useRenderElement({
    props: () => {
      const merged: any = {};
      Object.assign(
        merged,
        {
          'aria-labelledby': ariaLabelledby.value,
          id,
          role: 'group',
        },
        {...unrefs(elementProps)},
      );
      const validationProps = validation.getValidationProps(disabled, merged);
      Object.assign(merged, validationProps);
      return [merged];
    },
    state: stateValueFn,
    stateAttributesMapping: sliderStateAttributesMapping as any,
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <SliderRootContext.Provider
      value={
        (() => {
          const stateValue = stateValueFn();
          return buildContextValue(stateValue) as any;
        })()
      }
    >
      <CompositeList elementsRef={rawRef(thumbRefs)} onMapChange={(m) => (thumbMap.value = m)}>
        {element()}
      </CompositeList>
    </SliderRootContext.Provider>
  );
}

export interface SliderRootState extends FieldRootState {
  /**
   * The index of the active thumb.
   */
  activeThumbIndex: number;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the thumb is currently being dragged.
   */
  dragging: boolean;
  /**
   * The maximum value.
   */
  max: number;
  /**
   * The minimum value.
   */
  min: number;
  /**
   * The minimum steps between values in a range slider.
   * @default 0
   */
  minStepsBetweenValues: number;
  /**
   * The component orientation.
   */
  orientation: Orientation;
  /**
   * The step increment of the slider when incrementing or decrementing. It will snap
   * to multiples of this value. Decimal values are supported.
   * @default 1
   */
  step: number;
  /**
   * The raw number value of the slider.
   */
  values: readonly number[];
}

export interface SliderRootProps<
  Value extends number | readonly number[] = number | readonly number[],
> extends BaseUIComponentProps<'div', SliderRootState> {
  /**
   * The uncontrolled value of the slider when it's initially rendered.
   *
   * To render a controlled slider, use the `value` prop instead.
   */
  defaultValue?: Value | undefined;
  /**
   * Whether the slider should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum allowed value of the slider.
   * Should not be equal to min.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum allowed value of the slider.
   * Should not be equal to max.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The minimum steps between values in a range slider.
   * @default 0
   */
  minStepsBetweenValues?: number | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the slider inputs.
   * Useful when the slider is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
  /**
   * The granularity with which the slider can step through values. (A "discrete" slider.)
   * The `min` prop serves as the origin for the valid values.
   * We recommend (max - min) to be evenly divisible by the step.
   * @default 1
   */
  step?: number | undefined;
  /**
   * The granularity with which the slider can step through values when using Page Up/Page Down or Shift + Arrow Up/Arrow Down.
   * @default 10
   */
  largeStep?: number | undefined;
  /**
   * How the thumb(s) are aligned relative to `Slider.Control` when the value is at `min` or `max`:
   * - `center`: The center of the thumb is aligned with the control edge
   * - `edge`: The thumb is inset within the control such that its edge is aligned with the control edge
   * - `edge-client-only`: Same as `edge` but renders after React hydration on the client, reducing bundle size in return
   * @default 'center'
   */
  thumbAlignment?: 'center' | 'edge' | 'edge-client-only' | undefined;
  /**
   * Controls how thumbs behave when they collide during pointer interactions.
   *
   * - `'push'` (default): Thumbs push each other without restoring their previous positions when dragged back.
   * - `'swap'`: Thumbs swap places when dragged past each other.
   * - `'none'`: Thumbs cannot move past each other; excess movement is ignored.
   *
   * @default 'push'
   */
  thumbCollisionBehavior?: 'push' | 'swap' | 'none' | undefined;
  /**
   * The value of the slider.
   * For range sliders, provide an array with one value per thumb.
   */
  value?: Value | undefined;
  /**
   * Callback function that is fired when the slider's value changed.
   * Receives the new value as the first argument; the originating event is
   * available as `eventDetails.event`. The value is also reflected on
   * `eventDetails.event.target.value` for form integration.
   *
   * The `eventDetails.reason` indicates what triggered the change:
   *
   * - `'input-change'` when the hidden range input emits a change event (for example, via form integration)
   * - `'track-press'` when the control track is pressed
   * - `'drag'` while dragging a thumb
   * - `'keyboard'` for keyboard input
   * - `'none'` when the change is triggered without a specific interaction
   */
  onValueChange?:
    | ((
        value: Value extends number ? number : Value,
        eventDetails: SliderRoot.ChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Callback function that is fired when a value change is committed.
   * Does not fire if the value did not change, or if the change was canceled.
   * **Warning**: This is a generic event, not a change event.
   *
   * The `eventDetails.reason` indicates what triggered the commit:
   *
   * - `'drag'` while dragging a thumb
   * - `'track-press'` when the control track is pressed
   * - `'keyboard'` for keyboard input
   * - `'input-change'` when the hidden range input emits a change event (for example, via form integration)
   * - `'none'` when the commit occurs without a specific interaction
   */
  onValueCommitted?:
    | ((
        value: Value extends number ? number : Value,
        eventDetails: SliderRoot.CommitEventDetails,
      ) => void)
    | undefined;
}

export interface SliderRootChangeEventCustomProperties {
  /**
   * The index of the active thumb at the time of the change.
   */
  activeThumbIndex: number;
}

export type SliderRootChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.trackPress
  | typeof REASONS.drag
  | typeof REASONS.keyboard
  | typeof REASONS.none;
export type SliderRootChangeEventDetails = BaseUIChangeEventDetails<
  SliderRoot.ChangeEventReason,
  SliderRootChangeEventCustomProperties
>;

export type SliderRootCommitEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.trackPress
  | typeof REASONS.drag
  | typeof REASONS.keyboard
  | typeof REASONS.none;
export type SliderRootCommitEventDetails = BaseUIGenericEventDetails<SliderRoot.CommitEventReason>;

export namespace SliderRoot {
  export type State = SliderRootState;
  export type Props<Value extends number | readonly number[] = number | readonly number[]> =
    SliderRootProps<Value>;
  export type ChangeEventReason = SliderRootChangeEventReason;
  export type ChangeEventDetails = SliderRootChangeEventDetails;
  export type CommitEventReason = SliderRootCommitEventReason;
  export type CommitEventDetails = SliderRootCommitEventDetails;
}

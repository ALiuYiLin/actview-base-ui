import { computed, ref, watch, onMounted } from 'actview';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { warn } from '@base-ui/actview-utils/warn';
import { clamp } from '@base-ui/actview-utils/clamp';
import { areArraysEqual } from '@base-ui/actview-utils/areArraysEqual';
import { activeElement, contains } from '@base-ui/actview-utils/shadowDom';
import type { BaseUIComponentProps, HTMLProps, Orientation, RefObject } from '@/internals/types';
import {
  createChangeEventDetails,
  createGenericEventDetails,
  type BaseUIChangeEventDetails,
  type BaseUIGenericEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { useValueChanged } from '@/internals/useValueChanged';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElement';
import {
  CompositeList,
  type CompositeMetadata,
} from '@/internals/composite/list/CompositeList';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { resolveAriaLabelledBy, getDefaultLabelId } from '@/utils/resolveAriaLabelledBy';
import { asc } from '@/slider/utils/asc';
import { getSliderValue } from '@/slider/utils/getSliderValue';
import { validateMinimumDistance } from '@/slider/utils/validateMinimumDistance';
import type { ThumbMetadata } from '@/slider/thumb/SliderThumb';
import { sliderStateAttributesMapping } from '@/slider/root/stateAttributesMapping';
import { SliderRootContext } from '@/slider/root/SliderRootContext';
import { REASONS } from '@/internals/reasons';

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
  const id = useBaseUiId(componentProps.id);
  const defaultLabelId = getDefaultLabelId(id);

  const onValueChange = (
    value: number | number[],
    eventDetails: SliderRoot.ChangeEventDetails,
  ) => {
    const callback = componentProps.onValueChange as
      | ((value: number | number[], eventDetails: SliderRoot.ChangeEventDetails) => void)
      | undefined;
    callback?.(value, eventDetails);
  };

  const onValueCommitted = (
    value: number | readonly number[],
    eventDetails: SliderRoot.CommitEventDetails,
  ) => {
    const callback = componentProps.onValueCommitted as
      | ((value: number | readonly number[], eventDetails: SliderRoot.CommitEventDetails) => void)
      | undefined;
    callback?.(value, eventDetails);
  };

  const formContext = useFormContext();
  const fieldContext = useFieldRootContext();
  const labelableContext = useLabelableContext();

  const labelId = ref<string | undefined>(undefined);
  // 函数式更新（对齐 React）：useRegisteredLabelId 注销传函数，keyed remount 不误清
  const setLabelId = (
    next: string | undefined | ((current: string | undefined) => string | undefined),
  ) => {
    labelId.value = typeof next === 'function' ? next(labelId.value) : next;
  };

  const ariaLabelledby = computed(
    () =>
      componentProps['aria-labelledby'] ??
      resolveAriaLabelledBy(labelableContext.value.labelId, labelId.value),
  );

  const disabled = computed(
    () => fieldContext.value.disabled || (componentProps.disabled ?? false),
  );

  const name = computed(() => fieldContext.value.name ?? componentProps.name);

  // The internal value is potentially unsorted, e.g. to support frozen arrays
  // https://github.com/mui/material-ui/pull/28472
  const valueUnwrapped = useControlled<Value>({
    controlled: () => componentProps.value,
    default: () => (componentProps.defaultValue ?? (componentProps.min ?? 0)) as Value,
    name: 'Slider',
  });

  const sliderRef = { current: null as HTMLElement | null };
  const controlRef = { current: null as HTMLElement | null };
  const thumbRefs: RefObject<(HTMLElement | null)[]> = { current: [] };
  // The px distance between the pointer and the center of a pressed thumb.
  const pressedThumbCenterOffsetRef: RefObject<number | null> = { current: null };
  // The index of the pressed thumb, or the closest thumb if the `Control` was pressed.
  // This is updated on pointerdown, which is sooner than the `active/activeIndex`
  // state which is updated later when the nested `input` receives focus.
  const pressedThumbIndexRef: RefObject<number> = { current: -1 };
  // The values when the current drag interaction started.
  const pressedValuesRef: RefObject<readonly number[] | null> = { current: null };
  const lastChangeReasonRef: RefObject<SliderRoot.ChangeEventReason> = {
    current: REASONS.none,
  };

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

  const setDragging = (value: boolean) => {
    dragging.value = value;
  };

  const setIndicatorPosition = (
    value:
      | (number | undefined)[]
      | ((prev: (number | undefined)[]) => (number | undefined)[]),
  ) => {
    indicatorPosition.value =
      typeof value === 'function' ? value(indicatorPosition.value) : value;
  };

  const setThumbMap = (newMap: Map<Node, CompositeMetadata<ThumbMetadata>>) => {
    thumbMap.value = newMap;
  };

  const registerFieldControlRef = (element: HTMLElement | null) => {
    if (element) {
      controlRef.current = element;
    }
  };

  const range = computed(() => Array.isArray(valueUnwrapped.value));

  const values = computed<readonly number[]>(() => {
    const value = valueUnwrapped.value as Value;
    const min = componentProps.min ?? 0;
    const max = componentProps.max ?? 100;

    if (!Array.isArray(value)) {
      return [clamp(value as number, min, max)];
    }
    return value.map((v) => clamp(v, min, max)).sort(asc);
  });

  const fieldValue = computed(() => (range.value ? values.value : values.value[0]));

  useRegisterFieldControl(
    fieldContext.value.validation.inputRef,
    id,
    fieldValue,
    undefined,
    computed(() => !disabled.value),
    computed(() => componentProps.name),
  );

  useValueChanged(fieldValue, () => {
    const nextValue = fieldValue.value;
    const nextName = name.value;

    formContext.value.clearErrors(nextName);

    fieldContext.value.validation.change(nextValue);

    const initialValue = fieldContext.value.validityData.initialValue as
      | number
      | readonly number[]
      | undefined;
    let isDirty: boolean;
    if (Array.isArray(nextValue) && Array.isArray(initialValue)) {
      isDirty = !areArraysEqual(nextValue, initialValue);
    } else {
      isDirty = nextValue !== initialValue;
    }
    fieldContext.value.setDirty(isDirty);
  });

  const setValue = (
    newValue: number | number[],
    details: SliderRoot.ChangeEventDetails,
  ): boolean => {
    if (Number.isNaN(newValue) || areValuesEqual(newValue, valueUnwrapped.value as Value)) {
      return false;
    }

    // Redefine target to allow name and value to be read.
    // This allows seamless integration with the most popular form libraries.
    // https://github.com/mui/material-ui/issues/13485#issuecomment-676048492
    // Clone the event to not override `target` of the original event.
    const nativeEvent = details.event;
    const EventConstructor = nativeEvent.constructor as typeof Event;
    const clonedEvent = new EventConstructor(nativeEvent.type, nativeEvent);

    Object.defineProperty(clonedEvent, 'target', {
      writable: true,
      value: { value: newValue, name: name.value },
    });

    details.event = clonedEvent;

    onValueChange(newValue, details);

    if (details.isCanceled) {
      return false;
    }

    lastChangeReasonRef.current = details.reason;

    valueUnwrapped.setValueIfUncontrolled(newValue as Value);

    return true;
  };

  const handleInputChange = (valueInput: number, index: number, event: KeyboardEvent | Event) => {
    const newValue = getSliderValue(
      valueInput,
      index,
      componentProps.min ?? 0,
      componentProps.max ?? 100,
      range.value,
      values.value,
    );

    if (validateMinimumDistance(newValue, componentProps.step ?? 1, componentProps.minStepsBetweenValues ?? 0)) {
      const reason = 'key' in event ? REASONS.keyboard : REASONS.inputChange;
      const applied = setValue(
        newValue,
        createChangeEventDetails(reason, event, undefined, {
          activeThumbIndex: index,
        }),
      );
      fieldContext.value.setTouched(true);

      if (applied) {
        onValueCommitted(newValue, createGenericEventDetails(reason, event));
      }
    }
  };

  /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
  if (process.env.NODE_ENV !== 'production') {
    watch(
      [() => componentProps.min ?? 0, () => componentProps.max ?? 100],
      ([min, max]) => {
        if (min >= max) {
          warn('Slider `max` must be greater than `min`.');
        }
      },
      { immediate: true },
    );
  }

  // Sync disabled state: blur active element and clear active thumb index when disabled.
  // Split into initial (onMounted) and change (watch) per AI-001 workaround
  // (see actview-issue.md).
  const syncDisabled = () => {
    if (!disabled.value) {
      return;
    }

    const el = sliderRef.current;
    if (!el) {
      return;
    }

    const activeEl = activeElement(ownerDocument(el));
    if (contains(el, activeEl)) {
      // This is necessary because Firefox and Safari will keep focus
      // on a disabled element:
      // https://codesandbox.io/p/sandbox/mui-pr-22247-forked-h151h?file=/src/App.js
      (activeEl as HTMLElement).blur();
    }

    if (active.value !== -1) {
      setActive(-1);
    }
  };

  onMounted(() => {
    syncDisabled();
  });

  watch([() => disabled.value, () => active.value], () => {
    syncDisabled();
  });

  const state = computed<SliderRootState>(() => ({
    ...fieldContext.value.state,
    activeThumbIndex: active.value,
    disabled: disabled.value,
    dragging: dragging.value,
    orientation: componentProps.orientation ?? 'horizontal',
    max: componentProps.max ?? 100,
    min: componentProps.min ?? 0,
    minStepsBetweenValues: componentProps.minStepsBetweenValues ?? 0,
    step: componentProps.step ?? 1,
    values: values.value,
  }));

  const contextValue = computed<SliderRootContext>(() => ({
    active: active.value,
    controlRef,
    disabled: disabled.value,
    dragging: dragging.value,
    validation: fieldContext.value.validation,
    format: componentProps.format,
    handleInputChange,
    indicatorPosition: indicatorPosition.value,
    inset: (componentProps.thumbAlignment ?? 'center') !== 'center',
    labelId: ariaLabelledby.value as string | undefined,
    rootLabelId: defaultLabelId,
    largeStep: componentProps.largeStep ?? 10,
    lastUsedThumbIndex: lastUsedThumbIndex.value,
    lastChangeReasonRef,
    form: componentProps.form,
    locale: componentProps.locale,
    max: componentProps.max ?? 100,
    min: componentProps.min ?? 0,
    minStepsBetweenValues: componentProps.minStepsBetweenValues ?? 0,
    name: name.value,
    onValueCommitted,
    orientation: componentProps.orientation ?? 'horizontal',
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    pressedValuesRef,
    renderBeforeHydration: (componentProps.thumbAlignment ?? 'center') === 'edge',
    registerFieldControlRef,
    setActive,
    setDragging,
    setIndicatorPosition,
    setLabelId,
    setValue,
    state: state.value,
    step: componentProps.step ?? 1,
    thumbCollisionBehavior: componentProps.thumbCollisionBehavior ?? 'push',
    thumbMap: thumbMap.value,
    thumbRefs,
    values: values.value,
  }));

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      'aria-labelledby': _ariaLabelledBy,
      className: _className,
      defaultValue: _defaultValue,
      disabled: _disabled,
      id: _id,
      format: _format,
      largeStep: _largeStep,
      locale: _locale,
      render: _render,
      max: _max,
      min: _min,
      minStepsBetweenValues: _minStepsBetweenValues,
      form: _form,
      name: _name,
      onValueChange: _onValueChange,
      onValueCommitted: _onValueCommitted,
      orientation: _orientation,
      step: _step,
      thumbCollisionBehavior: _thumbCollisionBehavior,
      thumbAlignment: _thumbAlignment,
      value: _value,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, sliderRef],
    props: [
      () => ({
        'aria-labelledby': ariaLabelledby.value,
        id,
        role: 'group',
      }),
      getElementProps,
      (props) => fieldContext.value.validation.getValidationProps(disabled.value, props),
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  return (
    <SliderRootContext.Provider value={contextValue}>
      <CompositeList elementsRef={thumbRefs} onMapChange={setThumbMap}>
        {getElement()}
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

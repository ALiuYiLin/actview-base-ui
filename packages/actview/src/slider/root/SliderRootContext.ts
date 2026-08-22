import type { ComputedRef } from '@actview/core';
import type { Orientation, RefObject } from '@/internals/types';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import type { UseFieldValidationReturnValue } from '@/field/root/useFieldValidation';
import type { ThumbMetadata } from '@/slider/thumb/SliderThumb';
import type { SliderRoot, SliderRootState } from '@/slider/root/SliderRoot';
import { createContext } from '@/internals/createContext';

export interface SliderRootContext {
  /**
   * The index of the active thumb.
   */
  active: number;
  /**
   * The index of the most recently interacted thumb.
   */
  lastUsedThumbIndex: number;
  controlRef: RefObject<HTMLElement | null>;
  dragging: boolean;
  disabled: boolean;
  validation: UseFieldValidationReturnValue;
  /**
   * Options to format the value.
   */
  format: Intl.NumberFormatOptions | undefined;
  handleInputChange: (
    valueInput: number,
    index: number,
    event: KeyboardEvent | Event,
  ) => void;
  indicatorPosition: (number | undefined)[];
  inset: boolean;
  labelId?: string | undefined;
  rootLabelId?: string | undefined;
  /**
   * The large step value of the slider when incrementing or decrementing while the shift key is held,
   * or when using Page-Up or Page-Down keys. Snaps to multiples of this value.
   * @default 10
   */
  largeStep: number;
  lastChangeReasonRef: RefObject<SliderRoot.ChangeEventReason>;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum allowed value of the slider.
   */
  max: number;
  /**
   * The minimum allowed value of the slider.
   */
  min: number;
  /**
   * The minimum steps between values in a range slider.
   */
  minStepsBetweenValues: number;
  form: string | undefined;
  name: string | undefined;
  /**
   * Function to be called when drag ends and the pointer is released.
   */
  onValueCommitted: (
    newValue: number | readonly number[],
    data: SliderRoot.CommitEventDetails,
  ) => void;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation: Orientation;
  pressedThumbCenterOffsetRef: RefObject<number | null>;
  pressedThumbIndexRef: RefObject<number>;
  pressedValuesRef: RefObject<readonly number[] | null>;
  renderBeforeHydration: boolean;
  registerFieldControlRef: ((element: HTMLElement | null) => void) | null;
  setActive: (index: number) => void;
  setDragging: (value: boolean) => void;
  setIndicatorPosition: (
    value:
      | (number | undefined)[]
      | ((prev: (number | undefined)[]) => (number | undefined)[]),
  ) => void;
  setLabelId: (id: string | undefined) => void;
  /**
   * Applies a new value through `onValueChange` for keyboard, input, track-press,
   * and drag interactions. Returns `true` when the value was applied, or `false`
   * when it was invalid (NaN), unchanged, or the change was canceled.
   */
  setValue: (newValue: number | number[], details: SliderRoot.ChangeEventDetails) => boolean;
  state: SliderRootState;
  /**
   * The step increment of the slider when incrementing or decrementing. It will snap
   * to multiples of this value. Decimal values are supported.
   * @default 1
   */
  step: number;
  thumbCollisionBehavior: 'push' | 'swap' | 'none';
  thumbMap: Map<Node, CompositeMetadata<ThumbMetadata>>;
  thumbRefs: RefObject<(HTMLElement | null)[]>;
  /**
   * The value(s) of the slider
   */
  values: readonly number[];
}

export const SliderRootContext = createContext<SliderRootContext | undefined>(
  'base-ui-slider-root-context',
  undefined,
);

export function useSliderRootContext(): ComputedRef<SliderRootContext> {
  const context = SliderRootContext.use();
  if (context.value === undefined) {
    throw new Error(
      'Base UI: SliderRootContext is missing. Slider parts must be placed within <Slider.Root>.',
    );
  }
  return context as ComputedRef<SliderRootContext>;
}

import { computed, ref } from 'actview';
import { clamp } from '@base-ui/actview-utils/clamp';
import { formatNumber } from '@base-ui/actview-utils/formatNumber';
import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import { MeterRootContext } from './MeterRootContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { valueToPercent } from '../../utils/valueToPercent';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterRoot(componentProps: MeterRoot.Props) {
  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (id: string | undefined) => {
    labelId.value = id;
  };

  const getDerived = () => {
    const { value, min = 0, max = 100, format, locale } = componentProps;

    // `clamp` handles infinity, but NaN needs an explicit fallback before normalizing range outputs.
    const rawPercentage = valueToPercent(value, min, max);
    const percentageValue = clamp(Number.isNaN(rawPercentage) ? 0 : rawPercentage, 0, 100);
    const clampedValue = clamp(Number.isNaN(value) ? min : value, min, max);

    // Format the clamped value so visible and accessible text stay in sync with `aria-valuenow` and
    // the indicator fill. The raw value remains available as the second `getAriaValueText` argument.
    const formattedValue = format
      ? formatNumber(clampedValue, locale, format)
      : formatNumber(percentageValue / 100, locale, { style: 'percent' });

    return { percentageValue, clampedValue, formattedValue };
  };

  const contextValue = computed<MeterRootContext>(() => {
    const derived = getDerived();
    return {
      formattedValue: derived.formattedValue,
      percentageValue: derived.percentageValue,
      setLabelId,
      value: componentProps.value,
    };
  });

  const getRootProps = (prev: HTMLProps): HTMLProps => {
    const { getAriaValueText, value, children } = componentProps;
    const derived = getDerived();

    let ariaValuetext = derived.formattedValue;
    if (getAriaValueText) {
      ariaValuetext = getAriaValueText(derived.formattedValue, value);
    }

    return {
      ...prev,
      'aria-labelledby': labelId.value,
      'aria-valuemax': componentProps.max ?? 100,
      'aria-valuemin': componentProps.min ?? 0,
      'aria-valuenow': derived.clampedValue,
      'aria-valuetext': ariaValuetext,
      role: 'meter',
      children: (
        <>
          {children}
          <span role="presentation" style={visuallyHidden}>
            {/* force NVDA to read the label https://github.com/mui/base-ui/issues/4184 */}x
          </span>
        </>
      ),
    };
  };

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      format,
      getAriaValueText,
      locale,
      max,
      min,
      value,
      render,
      className,
      children,
      style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [getRootProps, getElementProps],
  });

  return <MeterRootContext.Provider value={contextValue}>{getElement()}</MeterRootContext.Provider>;
}

export interface MeterRootState {}

export interface MeterRootProps extends BaseUIComponentProps<'div', MeterRootState> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the meter.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * A function that returns a string value that provides a human-readable text alternative for `aria-valuenow`, the current value of the meter.
   */
  getAriaValueText?: ((formattedValue: string, value: number) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value.
   */
  value: number;
}

export namespace MeterRoot {
  export type State = MeterRootState;
  export type Props = MeterRootProps;
}

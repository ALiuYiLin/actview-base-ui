import { defineComponent, ref, toValue, useRootElement } from 'actview';
import { visuallyHidden } from '@/utils/visuallyHidden';
import { formatNumber } from '@/utils/formatNumber';
import { clamp } from '@/utils/clamp';
import { valueToPercent } from '@/utils/valueToPercent';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { MeterRootContext } from './MeterRootContext';

/**
 * Groups all parts of the meter and provides the current value to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterRoot = defineComponent(function (componentProps: MeterRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const format = toValue(componentProps.format);
  const getAriaValueText = componentProps.getAriaValueText;
  const locale = toValue(componentProps.locale);
  const max = toValue(componentProps.max) ?? 100;
  const min = toValue(componentProps.min) ?? 0;
  const valueProp = toValue(componentProps.value) ?? 0;

  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (v: string | undefined) => (labelId.value = v);

  // `clamp` handles infinity, but NaN needs an explicit fallback before normalizing range outputs.
  const rawPercentage = valueToPercent(valueProp, min, max);
  const percentageValue = clamp(Number.isNaN(rawPercentage) ? 0 : rawPercentage, 0, 100);
  const clampedValue = clamp(Number.isNaN(valueProp) ? min : valueProp, min, max);

  // Format the clamped value so visible and accessible text stay in sync with `aria-valuenow` and
  // the indicator fill. The raw value remains available as the second `getAriaValueText` argument.
  const formattedValue = format
    ? formatNumber(clampedValue, locale, format)
    : formatNumber(percentageValue / 100, locale, {style: 'percent'});

  let ariaValuetext = formattedValue;
  if (getAriaValueText) {
    ariaValuetext = getAriaValueText(formattedValue, valueProp);
  }

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, children, style, ...elementProps} = componentProps;

    const defaultProps: HTMLProps = {
      'aria-labelledby': labelId.value,
      'aria-valuemax': max,
      'aria-valuemin': min,
      'aria-valuenow': clampedValue,
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

    const contextValue: MeterRootContext = {
      formattedValue,
      percentageValue,
      setLabelId,
      value: valueProp,
    };

    const merged: HTMLProps = {};
    Object.assign(merged, defaultProps, elementProps);
    if (typeof className === 'function') {
      merged.className = className({});
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style({});
    } else if (style !== undefined) {
      merged.style = style;
    }

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ref: rootRef} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <div {...merged} ref={rootRef} />;
    }

    return (
      <MeterRootContext.Provider value={contextValue as any}>{element}</MeterRootContext.Provider>
    );
  };
}) as unknown as (props: MeterRoot.Props) => JSX.Element;

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
   * Accepts a function which returns a string value that provides a human-readable text alternative for the current value of the meter.
   */
  getAriaValueText?: ((formattedValue: string, value: number) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The value of the meter.
   * @default 0
   */
  value?: number | undefined;
}

export namespace MeterRoot {
  export type State = MeterRootState;
  export type Props = MeterRootProps;
}

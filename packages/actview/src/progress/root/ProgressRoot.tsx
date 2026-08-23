import { defineComponent, ref, toValue, useRootElement } from 'actview';
import { visuallyHidden } from '@/utils/visuallyHidden';
import { formatNumber } from '@/utils/formatNumber';
import { clamp } from '@/utils/clamp';
import { valueToPercent } from '@/utils/valueToPercent';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { ProgressRootContext } from './ProgressRootContext';
import { progressStateAttributesMapping } from './stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressRoot = defineComponent(function (componentProps: ProgressRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const format = toValue(componentProps.format);
  const getAriaValueText = componentProps.getAriaValueText;
  const locale = toValue(componentProps.locale);
  const max = toValue(componentProps.max) ?? 100;
  const min = toValue(componentProps.min) ?? 0;
  const value = toValue(componentProps.value) ?? null;

  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (v: string | undefined) => (labelId.value = v);

  // `value === null` (or any non-finite value) keeps Progress indeterminate. Otherwise compute a
  // single clamped value and normalized percentage so completion status, `aria-valuenow`, the
  // formatted text, the default `aria-valuetext`, and the indicator width all stay in sync for any
  // `min`/`max` (not just the default 0–100).
  let status: ProgressStatus = 'indeterminate';
  let percentageValue: number | null = null;
  let clampedValue: number | null = null;
  let formattedValue = '';
  // Derived alongside `status` so the indeterminate condition is not restated anywhere else.
  let defaultAriaValueText = 'indeterminate progress';

  if (value != null && Number.isFinite(value)) {
    const rawPercentage = valueToPercent(value, min, max);
    percentageValue = clamp(Number.isNaN(rawPercentage) ? 0 : rawPercentage, 0, 100);
    clampedValue = clamp(value, min, max);
    status = clampedValue === max ? 'complete' : 'progressing';
    // Format the clamped value so visible and accessible text stay in sync with `aria-valuenow` and
    // the indicator fill. The raw value remains available as the second `getAriaValueText` argument.
    formattedValue = format
      ? formatNumber(clampedValue, locale, format)
      : formatNumber(percentageValue / 100, locale, {style: 'percent'});
    defaultAriaValueText = formattedValue;
  }

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, children, style, ...elementProps} = componentProps;

    const stateValue: ProgressRootState = {status};

    const defaultProps: HTMLProps = {
      'aria-labelledby': labelId.value,
      'aria-valuemax': max,
      'aria-valuemin': min,
      'aria-valuenow': clampedValue ?? undefined,
      'aria-valuetext': getAriaValueText
        ? getAriaValueText(formattedValue, value)
        : defaultAriaValueText,
      role: 'progressbar',
      children: (
        <>
          {children}
          <span role="presentation" style={visuallyHidden}>
            {/* force NVDA to read the label https://github.com/mui/base-ui/issues/4184 */}x
          </span>
        </>
      ),
    };

    const contextValue: ProgressRootContext = {
      formattedValue,
      percentageValue,
      setLabelId,
      state: stateValue,
      value,
    };

    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, defaultProps, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: rootRef} as any);
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
      <ProgressRootContext.Provider value={contextValue as any}>{element}</ProgressRootContext.Provider>
    );
  };
}) as unknown as (props: ProgressRoot.Props) => JSX.Element;

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';

export interface ProgressRootState {
  /**
   * The current status.
   */
  status: ProgressStatus;
}

export interface ProgressRootProps extends BaseUIComponentProps<'div', ProgressRootState> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the progress bar.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Accepts a function which returns a string value that provides a human-readable text alternative for the current value of the progress bar.
   */
  getAriaValueText?: ((formattedValue: string, value: number | null) => string) | undefined;
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
   * The value of the progress bar.
   * The value should be a number between `min` and `max`.
   * Setting this to `null` makes the progress bar indeterminate.
   * @default null
   */
  value?: number | null | undefined;
}

export namespace ProgressRoot {
  export type State = ProgressRootState;
  export type Props = ProgressRootProps;
}

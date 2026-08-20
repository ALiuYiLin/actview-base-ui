import { computed, ref } from 'actview';
import { clamp } from '@base-ui/actview-utils/clamp';
import { formatNumber } from '@base-ui/actview-utils/formatNumber';
import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import { valueToPercent } from '../../utils/valueToPercent';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { ProgressRootContext } from './ProgressRootContext';
import { progressStateAttributesMapping } from './stateAttributesMapping';

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressRoot(componentProps: ProgressRoot.Props) {
  const labelId = ref<string | undefined>(undefined);
  // 函数式更新（对齐 React）：useRegisteredLabelId 注销传函数，keyed remount 不误清
  const setLabelId = (
    next: string | undefined | ((current: string | undefined) => string | undefined),
  ) => {
    labelId.value = typeof next === 'function' ? next(labelId.value) : next;
  };

  // `value === null` (or any non-finite value) keeps Progress indeterminate. Otherwise compute a
  // single clamped value and normalized percentage so completion status, `aria-valuenow`, the
  // formatted text, the default `aria-valuetext`, and the indicator width all stay in sync for any
  // `min`/`max` (not just the default 0–100).
  const getDerived = () => {
    const { value, min = 0, max = 100, format, locale } = componentProps;

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
      // Format the clamped value so visible and accessible text stay in sync with `aria-valuenow`
      // and the indicator fill. The raw value remains available as the second `getAriaValueText`
      // argument.
      formattedValue = format
        ? formatNumber(clampedValue, locale, format)
        : formatNumber(percentageValue / 100, locale, { style: 'percent' });
      defaultAriaValueText = formattedValue;
    }

    return { status, percentageValue, clampedValue, formattedValue, defaultAriaValueText };
  };

  const state = computed<ProgressRootState>(() => ({ status: getDerived().status }));

  const contextValue = computed<ProgressRootContext>(() => {
    const derived = getDerived();
    return {
      formattedValue: derived.formattedValue,
      percentageValue: derived.percentageValue,
      setLabelId,
      state: state.value,
      value: componentProps.value,
    };
  });

  const getRootProps = (prev: HTMLProps): HTMLProps => {
    const { getAriaValueText, value, children } = componentProps;
    const derived = getDerived();

    return {
      ...prev,
      'aria-labelledby': labelId.value,
      'aria-valuemax': componentProps.max ?? 100,
      'aria-valuemin': componentProps.min ?? 0,
      'aria-valuenow': derived.clampedValue ?? undefined,
      'aria-valuetext': getAriaValueText
        ? getAriaValueText(derived.formattedValue, value)
        : derived.defaultAriaValueText,
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
    state,
    ref: componentProps.ref,
    props: [getRootProps, getElementProps],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return (
    <ProgressRootContext.Provider value={contextValue}>{getElement()}</ProgressRootContext.Provider>
  );
}

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
   * The current value. The component is indeterminate when value is `null`.
   */
  value: number | null;
}

export namespace ProgressRoot {
  export type State = ProgressRootState;
  export type Props = ProgressRootProps;
}

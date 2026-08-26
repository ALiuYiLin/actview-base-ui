import { ref, toValue, toRefs, unrefs, useRootElement } from 'actview';
import { visuallyHidden } from '@/utils/visuallyHidden';
import { formatNumber } from '@/utils/formatNumber';
import { clamp } from '@/utils/clamp';
import { valueToPercent } from '@/utils/valueToPercent';
import type { BaseUIComponentProps } from '@/internals/types';
import { ProgressRootContext } from './ProgressRootContext';
import { progressStateAttributesMapping } from './stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressRoot(componentProps: ProgressRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<ProgressRootContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();

  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (v: string | undefined) => (labelId.value = v);

  // 派生值每次渲染重算（对齐 React 版每次 render）——setup 快照会导致
  // value/max/min 动态变化时 status/aria-valuenow 停留在首渲染。
  function computeDerived() {
    const format = toValue(componentProps.format);
    const getAriaValueText = componentProps.getAriaValueText;
    const locale = toValue(componentProps.locale);
    const max = toValue(componentProps.max) ?? 100;
    const min = toValue(componentProps.min) ?? 0;
    const value = toValue(componentProps.value) ?? null;

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

    return {
      status,
      percentageValue,
      clampedValue,
      formattedValue,
      defaultAriaValueText,
      getAriaValueText,
      value,
      max,
      min,
    };
  }

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, children, style, ...elementProps} = toRefs(componentProps);

  const stateFn = (): ProgressRootState => ({status: computeDerived().status});

  const {element} = useRenderElement({
    props: () => {
      const d = computeDerived();
      return [
        {
          'aria-labelledby': labelId.value,
          'aria-valuemax': d.max,
          'aria-valuemin': d.min,
          'aria-valuenow': d.clampedValue ?? undefined,
          'aria-valuetext': d.getAriaValueText
            ? d.getAriaValueText(d.formattedValue, d.value)
            : d.defaultAriaValueText,
          role: 'progressbar',
        },
        unrefs(elementProps),
      ];
    },
    state: stateFn,
    stateAttributesMapping: progressStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    // 显式 children：用户 children + 隐藏 NVDA 朗读 span
    children: () => (
      <>
        {children?.value}
        <span role="presentation" style={visuallyHidden}>
          {/* force NVDA to read the label https://github.com/mui/base-ui/issues/4184 */}x
        </span>
      </>
    ),
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ProgressRootContext.Provider
      value={(() => {
        const d = computeDerived();
        return {
          formattedValue: d.formattedValue,
          percentageValue: d.percentageValue,
          setLabelId,
          state: {status: d.status},
          value: d.value,
        };
      })() as any}
    >
      {element()}
    </ProgressRootContext.Provider>
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

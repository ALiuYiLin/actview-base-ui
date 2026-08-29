import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
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
  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (v: string | undefined) => (labelId.value = v);

  // 派生值：setup 级 computed（.value 在 JSX 内读取 → 归渲染 effect；props 直读
  // 响应式——value/max/min 动态变化时 status/aria-valuenow 实时重算）。
  const derived = computed(() => {
    const format = componentProps.format;
    const getAriaValueText = componentProps.getAriaValueText;
    const locale = componentProps.locale;
    const max = componentProps.max ?? 100;
    const min = componentProps.min ?? 0;
    const value = componentProps.value ?? null;

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
  });

  // 值形 props toRefs 活引用；children 单独引用（追加隐藏 NVDA 朗读 span）。
  // 组件自定义 props（format/getAriaValueText/locale/max/min/value）剔除——
  // 否则泄漏到 DOM（对齐 React）。
  const {
    render,
    className,
    style,
    children: childrenRef,
    format: _format,
    getAriaValueText: _getAriaValueText,
    locale: _locale,
    max: _max,
    min: _min,
    value: _value,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const state = computed(() => ({status: derived.value.status}));
  const rootChildren = computed(() => (
    <>
      {childrenRef?.value}
      <span role="presentation" style={visuallyHidden}>
        {/* force NVDA to read the label https://github.com/mui/base-ui/issues/4184 */}x
      </span>
    </>
  ));

  // store-as-is 载体：身份稳定 getter 对象（provide 只跑一次，computed 新对象
  // 会冻结快照）——字段渲染期求值，消费端读字段即追踪。
  const contextValue: ProgressRootContext = {
    get formattedValue() {
      return derived.value.formattedValue;
    },
    get percentageValue() {
      return derived.value.percentageValue;
    },
    setLabelId,
    get state() {
      return {status: derived.value.status};
    },
    get value() {
      return derived.value.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <ProgressRootContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: progressStateAttributesMapping,
          ref: componentProps.ref,
          props: [
            {
              'aria-labelledby': labelId.value,
              'aria-valuemax': derived.value.max,
              'aria-valuemin': derived.value.min,
              'aria-valuenow': derived.value.clampedValue ?? undefined,
              'aria-valuetext': derived.value.getAriaValueText
                ? derived.value.getAriaValueText(derived.value.formattedValue, derived.value.value)
                : derived.value.defaultAriaValueText,
              role: 'progressbar',
            },
            elementProps.value,
            {children: rootChildren.value},
          ],
        },
      )}
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

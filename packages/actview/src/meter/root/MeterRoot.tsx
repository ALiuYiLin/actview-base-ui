import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { visuallyHidden } from '@/utils/visuallyHidden';
import { formatNumber } from '@/utils/formatNumber';
import { clamp } from '@/utils/clamp';
import { valueToPercent } from '@/utils/valueToPercent';
import type { BaseUIComponentProps } from '@/internals/types';
import { MeterRootContext, type MeterRootContext as MeterRootContextValue } from './MeterRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Groups all parts of the meter and provides the current value to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterRoot(componentProps: MeterRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const labelId = ref<string | undefined>(undefined);
  // 支持函数形式（`(prev) => next`）——useRegisteredLabelId 卸载清理时传入
  const setLabelId = (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => {
    labelId.value = typeof v === 'function' ? v(labelId.value) : v;
  };

  // ---- 渲染期求值：setup 级 computed（.value 读取发生在 JSX 内 → 归渲染
  //      effect；props 直读响应式，value/format/locale/min/max 动态变化实时）----
  const derived = computed(() => {
    const format = componentProps.format;
    const getAriaValueText = componentProps.getAriaValueText;
    const locale = componentProps.locale;
    const max = componentProps.max ?? 100;
    const min = componentProps.min ?? 0;
    const valueProp = componentProps.value ?? 0;

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

    return {max, min, valueProp, percentageValue, clampedValue, formattedValue, ariaValuetext};
  });

  // 值形 props toRefs 活引用；children 不解构（追加隐藏 NVDA 朗读 span 后作为
  // 元素 children）。组件自定义 props（format/getAriaValueText/locale/max/min/
  // value）剔除——否则泄漏到 DOM（对齐 React）。
  const {
    render,
    className,
    children: childrenRef,
    style,
    format: _format,
    getAriaValueText: _getAriaValueText,
    locale: _locale,
    max: _max,
    min: _min,
    value: _value,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const rootChildren = computed(() => (
    <>
      {childrenRef?.value}
      <span role="presentation" style={visuallyHidden}>
        {/* force NVDA to read the label https://github.com/mui/base-ui/issues/4184 */}x
      </span>
    </>
  ));

  // store-as-is 载体：身份稳定 getter 对象（provide 只跑一次，新对象冻结快照）。
  const contextValue: MeterRootContextValue = {
    get formattedValue() {
      return derived.value.formattedValue;
    },
    get percentageValue() {
      return derived.value.percentageValue;
    },
    setLabelId,
    get value() {
      return derived.value.valueProp;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MeterRootContext.Provider value={contextValue}>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: {},
          ref: componentProps.ref,
          props: [
            {
              'aria-labelledby': labelId.value,
              'aria-valuemax': derived.value.max,
              'aria-valuemin': derived.value.min,
              'aria-valuenow': derived.value.clampedValue,
              'aria-valuetext': derived.value.ariaValuetext,
              role: 'meter',
            },
            elementProps.value,
            {children: rootChildren.value},
          ],
        },
      )}
    </MeterRootContext.Provider>
  );
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

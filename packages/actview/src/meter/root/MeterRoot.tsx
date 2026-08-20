import { computed, defineComponent, ref } from 'actview';
import { clamp } from '@base-ui/actview-utils/clamp';
import { formatNumber } from '@base-ui/actview-utils/formatNumber';
import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import { MeterRootContext } from './MeterRootContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { valueToPercent } from '../../utils/valueToPercent';
import { mergePropsN } from '../../merge-props';

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterRoot = defineComponent(function (componentProps: MeterRoot.Props) {
  // ================= setup（只执行一次） =================
  const labelId = ref<string | undefined>(undefined);
  const setLabelId = (id: string | undefined) => {
    labelId.value = id;
  };

  // 派生计算：渲染期调用（读 props 代理 → 响应式）
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

  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo，
  // 也保证 Provider watch 只在派生值真正变化时同步）
  const contextValue = computed<MeterRootContext>(() => {
    const derived = getDerived();
    return {
      formattedValue: derived.formattedValue,
      percentageValue: derived.percentageValue,
      setLabelId,
      value: componentProps.value,
    };
  });

  // 根 ref：组件根 VNode 是 Provider 包裹（div 在内层），useRootElement 拿不到
  // 实际元素 → ref() + 显式挂载（对照 CompositeRoot 边界，案例 6）
  const rootRef = ref<HTMLElement | null>(null);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      format: _format,
      getAriaValueText,
      locale: _locale,
      max: _max,
      min: _min,
      value,
      render,
      className,
      children,
      style,
      ref: _ref, // 用户 ref：根是 Provider 包裹，由内部 rootRef 绑定 DOM
      ...elementProps
    } = componentProps;

    const derived = getDerived();

    let ariaValuetext = derived.formattedValue;
    if (getAriaValueText) {
      ariaValuetext = getAriaValueText(derived.formattedValue, value);
    }

    const state: MeterRootState = {};

    const defaultProps: HTMLProps = {
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

    const merged = mergePropsN([
      defaultProps,
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    // render 三形态 + Provider 包裹（Provider 必须始终包裹：向子件提供派生值）
    if (typeof render === 'function') {
      return (
        <MeterRootContext.Provider value={contextValue.value}>
          {render({ ...merged, ...state, ref: rootRef })}
        </MeterRootContext.Provider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <MeterRootContext.Provider value={contextValue.value}>
          <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />
        </MeterRootContext.Provider>
      );
    }
    return (
      <MeterRootContext.Provider value={contextValue.value}>
        <div ref={rootRef} {...merged} />
      </MeterRootContext.Provider>
    );
  };
}) as (props: MeterRoot.Props) => any;

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

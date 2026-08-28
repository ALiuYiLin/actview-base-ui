import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { valueToPercent } from '@/utils/valueToPercent';
import { useIsHydrating } from '@/utils/useIsHydrating';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

function getIndicatorStyles(
  vertical: boolean,
  range: boolean,
  inset: boolean,
  start: number | undefined,
  end: number | undefined,
  forceHidden: boolean,
): Record<string, any> {
  const styles: Record<string, any> = {
    visibility:
      forceHidden || (inset && (start === undefined || (range && end === undefined)))
        ? 'hidden'
        : undefined,
    position: vertical ? 'absolute' : 'relative',
    [vertical ? 'width' : 'height']: 'inherit',
  };

  let startValue: string = `${start ?? 0}%`;
  let sizeValue: string = `${(end ?? 0) - (start ?? 0)}%`;

  if (inset) {
    styles['--start-position'] = startValue;
    startValue = 'var(--start-position)';

    if (range) {
      styles['--relative-size'] = sizeValue;
      sizeValue = 'var(--relative-size)';
    }
  }

  styles[vertical ? 'bottom' : 'insetInlineStart'] = range ? startValue : 0;
  styles[vertical ? 'height' : 'width'] = range ? sizeValue : startValue;

  return styles;
}

/**
 * Visualizes the current value of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderIndicator(componentProps: SliderIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useSliderRootContext();

  const isHydrating = useIsHydrating();

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<SliderRootState>(() => rootContext.state);

  // 根元素 props：透传 → indicator 定位样式。
  const rootProps = computed<Record<string, any>>(() => {
    const {indicatorPosition, inset, max, min, orientation, renderBeforeHydration, values} =
      rootContext;

    const vertical = orientation === 'vertical';
    const range = values.length > 1;

    const resolvedStyle =
      typeof style?.value === 'function' ? style.value(state.value) : style?.value;

    return {
      ...elementProps.value,
      style: Object.assign(
        {},
        getIndicatorStyles(
          vertical,
          range,
          inset,
          inset ? indicatorPosition[0] : valueToPercent(values[0], min, max),
          inset ? indicatorPosition[1] : valueToPercent(values[values.length - 1], min, max),
          inset && renderBeforeHydration && isHydrating,
        ),
        resolvedStyle,
      ),
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: sliderStateAttributesMapping,
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface SliderIndicatorState extends SliderRootState {}

export interface SliderIndicatorProps
  extends BaseUIComponentProps<'div', SliderIndicatorState> {}

export namespace SliderIndicator {
  export type State = SliderIndicatorState;
  export type Props = SliderIndicatorProps;
}

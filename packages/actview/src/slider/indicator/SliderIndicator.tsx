import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { valueToPercent } from '@/utils/valueToPercent';
import { useIsHydrating } from '@/utils/useIsHydrating';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

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
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useSliderRootContext();

  const isHydrating = useIsHydrating();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {indicatorPosition, inset, max, min, orientation, renderBeforeHydration, state, values} =
        rootContextRef.value;

      const vertical = orientation === 'vertical';
      const range = values.length > 1;

      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(state) : style?.value;

      const merged: any = {
        ...unrefs(elementProps),
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
      return [merged];
    },
    state: () => rootContextRef.value.state,
    stateAttributesMapping: sliderStateAttributesMapping as any,
    className,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface SliderIndicatorState extends SliderRootState {}

export interface SliderIndicatorProps extends BaseUIComponentProps<'div', SliderIndicatorState> {}

export namespace SliderIndicator {
  export type State = SliderIndicatorState;
  export type Props = SliderIndicatorProps;
}

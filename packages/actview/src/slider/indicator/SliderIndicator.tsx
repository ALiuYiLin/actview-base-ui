import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { valueToPercent } from '@/utils/valueToPercent';
import { useIsHydrating } from '@/utils/useIsHydrating';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { SliderRootState } from '../root/SliderRoot';

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
export const SliderIndicator = defineComponent(function (componentProps: SliderIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useSliderRootContext();

  const isHydrating = useIsHydrating();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style: styleProp, ...elementProps} = componentProps;

    const {indicatorPosition, inset, max, min, orientation, renderBeforeHydration, state, values} =
      rootContextRef.value;

    const vertical = orientation === 'vertical';
    const range = values.length > 1;

    const style = getIndicatorStyles(
      vertical,
      range,
      inset,
      inset ? indicatorPosition[0] : valueToPercent(values[0], min, max),
      inset ? indicatorPosition[1] : valueToPercent(values[values.length - 1], min, max),
      inset && renderBeforeHydration && isHydrating,
    );

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, sliderStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes, {style});
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof styleProp === 'function') {
      merged.style = Object.assign({}, style, styleProp(stateValue));
    } else if (styleProp !== undefined) {
      merged.style = Object.assign({}, style, styleProp);
    }
    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <div {...merged} ref={rootRef} />;
  };
}) as unknown as (props: SliderIndicator.Props) => JSX.Element;

export interface SliderIndicatorState extends SliderRootState {}

export interface SliderIndicatorProps extends BaseUIComponentProps<'div', SliderIndicatorState> {}

export namespace SliderIndicator {
  export type State = SliderIndicatorState;
  export type Props = SliderIndicatorProps;
}

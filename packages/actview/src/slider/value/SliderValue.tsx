import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { formatNumber } from '@/utils/formatNumber';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { SliderRootState } from '../root/SliderRoot';

/**
 * Displays the current value of the slider.
 * Renders an `<output>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export const SliderValue = defineComponent(function (componentProps: SliderValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useSliderRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {'aria-live': ariaLive = 'off', render, className, children, style, ...elementProps} =
      componentProps;

    const {thumbMap, state, values, format, locale} = rootContextRef.value;

    const outputFor =
      Array.from(thumbMap.values(), ({inputId}) => inputId)
        .join(' ')
        .trim() || undefined;

    const formattedValues = values.map((v) => formatNumber(v, locale, format));

    const defaultDisplayValue = formattedValues.join(' – ');

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, sliderStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {
        // off by default because it will keep announcing when the slider is being dragged
        // and also when the value is changing (but not yet committed)
        'aria-live': ariaLive,
        children:
          typeof children === 'function'
            ? (children as any)(formattedValues, values)
            : defaultDisplayValue,
        htmlFor: outputFor,
      },
      elementProps,
      stateAttributes,
    );
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
    return <output {...merged} ref={rootRef} />;
  };
}) as unknown as (props: SliderValue.Props) => JSX.Element;

export interface SliderValueState extends SliderRootState {}

export interface SliderValueProps
  extends Omit<BaseUIComponentProps<'output', SliderValueState>, 'children'> {
  children?:
    | null
    | ((formattedValues: readonly string[], values: readonly number[]) => any)
    | undefined;
}

export namespace SliderValue {
  export type State = SliderValueState;
  export type Props = SliderValueProps;
}

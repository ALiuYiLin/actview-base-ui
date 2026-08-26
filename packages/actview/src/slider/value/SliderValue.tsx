import { toRefs, toValue, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { formatNumber } from '@/utils/formatNumber';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Displays the current value of the slider.
 * Renders an `<output>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderValue(componentProps: SliderValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useSliderRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {thumbMap, state, values, format, locale} = rootContextRef.value;

      const ariaLive = toValue(componentProps['aria-live']) ?? 'off';

      const outputFor =
        Array.from(thumbMap.values(), ({inputId}) => inputId)
          .join(' ')
          .trim() || undefined;

      const formattedValues = values.map((v) => formatNumber(v, locale, format));

      const defaultDisplayValue = formattedValues.join(' – ');

      const merged: any = {
        // off by default because it will keep announcing when the slider is being dragged
        // and also when the value is changing (but not yet committed)
        'aria-live': ariaLive,
        htmlFor: outputFor,
        ...unrefs(elementProps),
      };
      return [merged];
    },
    state: () => rootContextRef.value.state,
    stateAttributesMapping: sliderStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    // children：render-prop（(formattedValues, values) => any）渲染期求值
    children: () => {
      const {values, format, locale} = rootContextRef.value;
      const formattedValues = values.map((v) => formatNumber(v, locale, format));
      const childrenValue = children?.value;
      return typeof childrenValue === 'function'
        ? (childrenValue as any)(formattedValues, values)
        : formattedValues.join(' – ');
    },
    defaultTag: 'output',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

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

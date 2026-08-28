import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Contains the slider indicator and represents the entire range of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderTrack(componentProps: SliderTrack.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useSliderRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = rootContextRef.value.state;
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateValue) : style?.value;
      const merged: any = {
        style: Object.assign({position: 'relative'}, resolvedStyle),
        ...unrefs(elementProps),
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

export interface SliderTrackState extends SliderRootState {}

export interface SliderTrackProps extends BaseUIComponentProps<'div', SliderTrackState> {}

export namespace SliderTrack {
  export type State = SliderTrackState;
  export type Props = SliderTrackProps;
}

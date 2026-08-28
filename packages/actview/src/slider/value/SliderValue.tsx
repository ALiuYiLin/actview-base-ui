import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { formatNumber } from '@/utils/formatNumber';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Displays the current value of the slider.
 * Renders an `<output>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderValue(componentProps: SliderValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问即追踪。
  const rootContext = useSliderRootContext();

  // 值形 props toRefs 活引用；children 单独排除（render prop）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<SliderValueState>(() => rootContext.state);

  // ⚠️ 不解构 getter 载体（解构会捕获快照）——computed 内属性访问。
  const formattedValues = computed(() =>
    rootContext.values.map((v: number) => formatNumber(v, rootContext.locale, rootContext.format)),
  );

  // 根元素 props：aria-live/htmlFor → 透传；children 为 render-prop 渲染结果
  // 或格式化值 join。
  const rootProps = computed<Record<string, any>>(() => {
    const ariaLive = componentProps['aria-live'] ?? 'off';

    const outputFor =
      Array.from(rootContext.thumbMap.values(), ({inputId}) => inputId)
        .join(' ')
        .trim() || undefined;

    return {
      // off by default because it will keep announcing when the slider is being dragged
      // and also when the value is changing (but not yet committed)
      'aria-live': ariaLive,
      htmlFor: outputFor,
      ...elementProps.value,
      children:
        typeof childrenRef?.value === 'function'
          ? (childrenRef.value as any)(formattedValues.value, rootContext.values)
          : formattedValues.value.join(' – '),
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'output',
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

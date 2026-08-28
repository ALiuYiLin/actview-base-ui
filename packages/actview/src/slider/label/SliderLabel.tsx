import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { useLabel, focusElementWithVisible } from '@/internals/labelable-provider/useLabel';
import { ownerDocument } from '@/utils/owner';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

/**
 * A label for the slider control.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderLabel(componentProps: SliderLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）。
  const rootContext = useSliderRootContext();

  // useLabel 必须在 setup 调用（useRegisteredLabelId 含 watch/computed/
  // onUnmounted——渲染期调用会每次渲染累积副作用）。
  // setLabelId/controlRef 是 Root 的稳定引用（setup 定义一次），setup 快照安全。
  const {setLabelId, controlRef, rootLabelId} = rootContext;

  function focusControl(event: MouseEvent, controlId: string | undefined) {
    if (controlId) {
      const controlElement = ownerDocument(event.currentTarget as Element).getElementById(controlId);
      if (isHTMLElement(controlElement)) {
        focusElementWithVisible(controlElement as HTMLElement);
        return;
      }
    }

    const fallbackInputs = controlRef.value?.querySelectorAll('input[type="range"]');
    const fallbackInput = fallbackInputs?.length === 1 ? fallbackInputs[0] : null;
    if (isHTMLElement(fallbackInput)) {
      focusElementWithVisible(fallbackInput as HTMLElement);
    }
  }

  const labelProps = useLabel({
    id: rootLabelId,
    setLabelId: setLabelId as any,
    focusControl,
  });

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

  // 根元素 props：labelProps（id/hover 处理器）→ 透传（剔除运行时 id 覆盖）。
  const rootProps = computed<Record<string, any>>(() => {
    // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
    const elementPropsWithoutId = {...elementProps.value} as any;
    delete elementPropsWithoutId.id;
    return {...labelProps, ...elementPropsWithoutId};
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

export interface SliderLabelState extends SliderRootState {}

export interface SliderLabelProps extends BaseUIComponentProps<'div', SliderLabelState> {}

export namespace SliderLabel {
  export type State = SliderLabelState;
  export type Props = SliderLabelProps;
}

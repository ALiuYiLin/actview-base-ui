import { toRefs, toValue, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { useLabel, focusElementWithVisible } from '@/internals/labelable-provider/useLabel';
import { ownerDocument } from '@/utils/owner';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

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
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useSliderRootContext();

  // useLabel 必须在 setup 调用（useRegisteredLabelId 含 watch/computed/
  // onUnmounted——渲染期调用会每次渲染累积副作用）。
  // setLabelId/controlRef 是 Root 的稳定引用（setup 定义一次），setup 快照安全。
  const {setLabelId, controlRef, rootLabelId} = rootContextRef.value;

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

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
      const elementPropsWithoutId = {...unrefs(elementProps)} as any;
      delete elementPropsWithoutId.id;

      return [labelProps, elementPropsWithoutId];
    },
    state: () => rootContextRef.value.state,
    stateAttributesMapping: sliderStateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export type SliderLabelState = SliderRootState;

export interface SliderLabelProps
  extends Omit<BaseUIComponentProps<'div', SliderLabel.State>, 'id'> {}

export namespace SliderLabel {
  export type State = SliderLabelState;
  export type Props = SliderLabelProps;
}

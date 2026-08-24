import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useLabel, focusElementWithVisible } from '@/internals/labelable-provider/useLabel';
import { ownerDocument } from '@/utils/owner';
import type { SliderRootState } from '../root/SliderRoot';

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

/**
 * A label for the slider control.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export const SliderLabel = defineComponent(function (componentProps: SliderLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useSliderRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;
    // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
    const elementPropsWithoutId = elementProps as typeof elementProps & {id?: string | undefined};
    delete elementPropsWithoutId.id;

    const {state, setLabelId, controlRef, rootLabelId} = rootContextRef.value;

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

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, sliderStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, labelProps, elementPropsWithoutId, stateAttributes);
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
    return <div {...merged} ref={rootRef}>{componentProps.children}</div>;
  };
}) as unknown as (props: SliderLabel.Props) => JSX.Element;

export type SliderLabelState = SliderRootState;

export interface SliderLabelProps
  extends Omit<BaseUIComponentProps<'div', SliderLabel.State>, 'id'> {}

export namespace SliderLabel {
  export type State = SliderLabelState;
  export type Props = SliderLabelProps;
}

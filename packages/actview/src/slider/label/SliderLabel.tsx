import { computed } from 'actview';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { focusElementWithVisible, useLabel } from '@/internals/labelable-provider/useLabel';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import type { SliderRoot } from '@/slider/root/SliderRoot';
import { useSliderRootContext } from '@/slider/root/SliderRootContext';
import { sliderStateAttributesMapping } from '@/slider/root/stateAttributesMapping';

/**
 * An accessible label that is automatically associated with the slider thumbs.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderLabel(componentProps: SliderLabel.Props) {
  const ctx = useSliderRootContext();

  const state = computed(() => ctx.value.state);
  const setLabelId = ctx.value.setLabelId;
  const controlRef = ctx.value.controlRef;
  const rootLabelId = ctx.value.rootLabelId;

  function focusControl(event: MouseEvent, controlId: string | undefined) {
    if (controlId) {
      const controlElement = ownerDocument(event.currentTarget as Element).getElementById(
        controlId,
      );
      if (isHTMLElement(controlElement)) {
        focusElementWithVisible(controlElement);
        return;
      }
    }

    const fallbackInputs = controlRef.current?.querySelectorAll('input[type="range"]');
    const fallbackInput = fallbackInputs?.length === 1 ? fallbackInputs[0] : null;
    if (isHTMLElement(fallbackInput)) {
      focusElementWithVisible(fallbackInput);
    }
  }

  const labelProps = useLabel({
    id: rootLabelId,
    setLabelId,
    focusControl,
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      style: _style,
      ...elementProps
    } = componentProps;
    // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
    delete (elementProps as typeof elementProps & { id?: string | undefined }).id;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [labelProps, getElementProps],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

export type SliderLabelState = SliderRoot.State;

export interface SliderLabelProps extends Omit<
  BaseUIComponentProps<'div', SliderLabel.State>,
  'id'
> {}

export namespace SliderLabel {
  export type State = SliderLabelState;
  export type Props = SliderLabelProps;
}

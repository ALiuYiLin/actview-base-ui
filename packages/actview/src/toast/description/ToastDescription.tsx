import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useToastLabelPart, useToastLabelElement } from '../utils/useToastLabelPart';
import { isRenderableNode } from '../utils/isRenderableNode';

/**
 * A description that describes the toast.
 * Can be used as the default message for the toast when no title is provided.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastDescription(componentProps: ToastDescription.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    id: idProp,
    children: _children,
    ...elementProps
  } = componentProps;

  const { id, resolveChildren, setId, context } = useToastLabelPart(
    idProp,
    () => componentProps.children,
    'description',
  );

  const state = computed<ToastDescriptionState>(() => ({ type: context.value.toast.type }));

  const getElement = useRenderElement('p', componentProps, {
    ref: componentProps.ref,
    state,
    props: [
      (prev: any) => ({ ...prev, id, children: resolveChildren() }),
      elementProps,
    ],
  });

  const shouldRender = () => isRenderableNode(resolveChildren());

  // Wrap in JSX so the Babel transform converts the component (a bare
  // `return fn(...)` stays a raw function and crashes the renderer, AI-003).
  return <>{useToastLabelElement(getElement, shouldRender, id, setId)}</>;
}

export interface ToastDescriptionState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastDescriptionProps extends BaseUIComponentProps<'p', ToastDescriptionState> {}

export namespace ToastDescription {
  export type State = ToastDescriptionState;
  export type Props = ToastDescriptionProps;
}

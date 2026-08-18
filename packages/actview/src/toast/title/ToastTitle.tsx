import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useToastLabelPart, useToastLabelElement } from '../utils/useToastLabelPart';
import { isRenderableNode } from '../utils/isRenderableNode';

/**
 * A title that labels the toast.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastTitle(componentProps: ToastTitle.Props) {
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
    'title',
  );

  const state = computed<ToastTitleState>(() => ({ type: context.value.toast.type }));

  const getElement = useRenderElement('h2', componentProps, {
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

export interface ToastTitleState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastTitleProps extends BaseUIComponentProps<'h2', ToastTitleState> {}

export namespace ToastTitle {
  export type State = ToastTitleState;
  export type Props = ToastTitleProps;
}

import { computed } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import { usePopoverPositionerContext } from '@/popover/positioner/PopoverPositionerContext';
import { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { popupViewportStateMapping, usePopupViewport } from '@/utils/usePopupViewport';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverViewport(componentProps: PopoverViewport.Props) {
  const { render: _render, className: _className, style: _style, children, ...elementProps } =
    componentProps;

  const store = usePopoverRootContext().value!;
  const positioner = usePopoverPositionerContext();

  const instantType = store.useState('instantType');

  const { children: childrenToRender, state: viewportState } = usePopupViewport({
    store,
    side: computed(() => positioner.value.side),
    children,
  });

  const state = computed<PopoverViewportState>(() => ({
    activationDirection: viewportState.value.activationDirection,
    transitioning: viewportState.value.transitioning,
    instant: instantType.value,
  }));

  const element = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [elementProps, (prev: any) => ({ ...prev, children: childrenToRender() })],
    stateAttributesMapping: popupViewportStateMapping,
  });

  return <>{element()}</>;
}

export interface PopoverViewportState {
  /**
   * The activation direction of the transitioned content.
   */
  activationDirection: string | undefined;
  /**
   * Whether the viewport is currently transitioning between contents.
   */
  transitioning: boolean;
  /**
   * Present if animations should be instant.
   */
  instant: 'dismiss' | 'click' | 'focus' | 'trigger-change' | undefined;
}

export interface PopoverViewportProps extends BaseUIComponentProps<'div', PopoverViewportState> {
  /**
   * The content to render inside the transition container.
   */
  children?: VNodeChild;
}

export namespace PopoverViewport {
  export type Props = PopoverViewportProps;
  export type State = PopoverViewportState;
}

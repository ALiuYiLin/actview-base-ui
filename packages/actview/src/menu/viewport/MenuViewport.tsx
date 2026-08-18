import { computed } from 'actview';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { popupViewportStateMapping, usePopupViewport } from '../../utils/usePopupViewport';
import { mergeProps } from '../../merge-props';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuViewport(componentProps: MenuViewport.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    children,
    ...elementProps
  } = componentProps;

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const positionerContext = useMenuPositionerContext();

  const instantType = store.useState('instantType');

  const { children: childrenToRender, state: viewportState } = usePopupViewport({
    store,
    side: positionerContext.value.side,
    children,
  });

  const state = computed<MenuViewportState>(() => ({
    activationDirection: viewportState.value.activationDirection,
    transitioning: viewportState.value.transitioning,
    instant: instantType.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
      (prev: any) => mergeProps(prev, { children: childrenToRender() }) as HTMLProps,
    ],
    stateAttributesMapping: popupViewportStateMapping,
  });

  return <>{getElement()}</>;
}

export interface MenuViewportState {
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
  instant: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
}

export interface MenuViewportProps extends BaseUIComponentProps<'div', MenuViewportState> {
  /**
   * The content to render inside the transition container.
   */
  children?: any;
}

export namespace MenuViewport {
  export type Props = MenuViewportProps;
  export type State = MenuViewportState;
}

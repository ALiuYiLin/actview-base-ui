import { toRefs, unrefs, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 */
export function PopoverViewport(componentProps: PopoverViewport.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = usePopoverRootContext(false);
  const positionerContext = usePopoverPositionerContext();
  const side = positionerContext?.side;
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const instantType = store.useState('instantType');

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side,
    children: children as any,
  });

  const state = (): PopoverViewportState => ({
    activationDirection: viewportState.activationDirection,
    transitioning: viewportState.transitioning,
    instant: instantType.value as any,
  });

  const {element} = useRenderElement({
    props: () => {
      const merged: any = mergePropsN<any>([{...unrefs(elementProps)}]);
      if (state().activationDirection) {
        merged['data-activation-direction'] = state().activationDirection;
      }
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children: () => toValue(childrenToRender as any),
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface PopoverViewportState {
  /**
   * The direction of the content transition.
   */
  activationDirection: string | undefined;
  /**
   * Whether the content is currently transitioning.
   */
  transitioning: boolean;
  /**
   * Whether transitions should be skipped.
   */
  instant: string | undefined;
}

export interface PopoverViewportProps extends BaseUIComponentProps<'div', PopoverViewportState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverViewport {
  export type State = PopoverViewportState;
  export type Props = PopoverViewportProps;
}

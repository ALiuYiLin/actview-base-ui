import { toRefs, unrefs, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A viewport for displaying content transitions.
 * Renders a `<div>` element.
 */
export function TooltipViewport(componentProps: TooltipViewport.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useTooltipRootContext(false);
  const positionerContext = useTooltipPositionerContext();
  const side = positionerContext?.side;
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const instantType = store.useState('instantType');

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side,
    children: children as any,
  });

  const state = (): TooltipViewportState => ({
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

export interface TooltipViewportState {
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

export interface TooltipViewportProps extends BaseUIComponentProps<'div', TooltipViewportState> {
  children?: any;
  [key: string]: any;
}

export namespace TooltipViewport {
  export type State = TooltipViewportState;
  export type Props = TooltipViewportProps;
}

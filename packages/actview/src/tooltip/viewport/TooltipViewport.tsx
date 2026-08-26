import { toRefs, toValue, unrefs } from 'actview';
import { mergePropsN } from '@/merge-props';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A viewport for displaying content transitions.
 * Renders a `<div>` element.
 */
export function TooltipViewport(componentProps: TooltipViewport.Props) {
  const store = useTooltipRootContext(false);
  const positionerContext = useTooltipPositionerContext();
  const side = positionerContext?.side;

  const instantType = store.useState('instantType');

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side,
    children: () => toValue(componentProps.children),
  });

  const state = (): TooltipViewportState => ({
    activationDirection: viewportState.activationDirection,
    transitioning: viewportState.transitioning,
    instant: instantType.value as any,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ref: refProp, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = state();

      const merged: any = mergePropsN<any>([
        {...unrefs(elementProps)},
        {children: toValue(childrenToRender)},
      ]);

      if (stateValue.activationDirection) {
        merged['data-activation-direction'] = stateValue.activationDirection;
      }
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => [refProp as any],
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

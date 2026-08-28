import { toRefs, toValue, unrefs } from 'actview';
import { mergePropsN } from '@/merge-props';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 */
export function PreviewCardViewport(componentProps: PreviewCardViewport.Props) {
  const store = usePreviewCardRootContext(false);
  const positionerContext = usePreviewCardPositionerContext();
  const side = positionerContext?.side;

  const instantType = store.useState('instantType');

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side,
    children: () => toValue(componentProps.children),
  });

  const state = (): PreviewCardViewportState => ({
    activationDirection: viewportState.activationDirection,
    transitioning: viewportState.transitioning,
    instant: instantType.value as any,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ref: refProp, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const stateValue = state();

      const merged: any = mergePropsN<any>([{...unrefs(elementProps)}]);

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
    children: () => toValue(childrenToRender),
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface PreviewCardViewportState {
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

export interface PreviewCardViewportProps extends BaseUIComponentProps<'div', PreviewCardViewportState> {
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardViewport {
  export type State = PreviewCardViewportState;
  export type Props = PreviewCardViewportProps;
}

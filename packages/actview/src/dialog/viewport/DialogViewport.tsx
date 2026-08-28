import { toRefs, unrefs, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { useDialogRootContext } from '../root/DialogRootContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A viewport for displaying content transitions.
 * Renders a `<div>` element.
 */
export function DialogViewport(componentProps: DialogViewport.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useDialogRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);
  const instantType = store.useState('instantType');

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side: undefined as any,
    children: children as any,
  });

  const state = (): DialogViewportState => ({
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
    refs: () => {
      const refs: any[] = [
        (el: HTMLDivElement | null) => {
          store.state.viewportElement = el;
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children: () => toValue(childrenToRender as any),
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface DialogViewportState {
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

export interface DialogViewportProps extends BaseUIComponentProps<'div', DialogViewportState> {
  children?: any;
  [key: string]: any;
}

export namespace DialogViewport {
  export type State = DialogViewportState;
  export type Props = DialogViewportProps;
}

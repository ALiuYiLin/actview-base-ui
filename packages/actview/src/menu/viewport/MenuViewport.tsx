import { computed, toRefs, unrefs, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { usePopupViewport } from '@/utils/usePopupViewport';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 */
export function MenuViewport(componentProps: MenuViewport.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, ref, ...elementProps} = toRefs(componentProps);

  const {store} = useMenuRootContext();
  const positionerContext = useMenuPositionerContext(true);
  const side = positionerContext?.value?.side;

  const instantType = store.useState('instantType');

  // children 以 computed 传入（render 期求值 props）：payload 驱动的
  // viewport 内容在 trigger 切换后更新，setup 快照会停留首次渲染。
  const childrenRef = computed(() => toValue(componentProps.children));

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side,
    children: childrenRef,
  });

  const state = (): MenuViewportState => ({
    activationDirection: viewportState.activationDirection,
    transitioning: viewportState.transitioning,
    instant: instantType.value as any,
  });

  const {element} = useRenderElement({
    props: () => {
      const stateValue = state();
      const merged: any = mergePropsN<any>([unrefs(elementProps)]);
      if (stateValue.activationDirection) {
        merged['data-activation-direction'] = stateValue.activationDirection;
      }
      return [merged];
    },
    state,
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [ref] : []),
    children: () => childrenToRender.value,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
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

export interface MenuViewportProps {
  /**
   * The content to render inside the transition container.
   */
  children?: any;
  [key: string]: any;
}

export namespace MenuViewport {
  export type State = MenuViewportState;
  export type Props = MenuViewportProps;
}

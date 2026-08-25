import { computed, defineComponent, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { popupViewportStateMapping, usePopupViewport } from '@/utils/usePopupViewport';

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content
 * changes based on the trigger, and switching between them is animated.
 * Renders a `<div>` element.
 */
export const MenuViewport = defineComponent(function MenuViewport(
  componentProps: MenuViewport.Props,
) {
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

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;
    const stateValue = state();

    const merged: any = mergePropsN<any>([elementProps, {children: childrenToRender.value}]);

    if (stateValue.activationDirection) {
      merged['data-activation-direction'] = stateValue.activationDirection;
    }

    const mergedRefs = (el: HTMLDivElement | null) => {
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{childrenToRender.value}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{childrenToRender.value}</div>;
  };
});

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

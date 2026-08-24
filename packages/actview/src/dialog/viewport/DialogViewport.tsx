import { defineComponent, toValue } from 'actview';
import { mergePropsN } from '@/merge-props';
import { useDialogRootContext } from '../root/DialogRootContext';
import { popupViewportStateMapping, usePopupViewport } from '@/utils/usePopupViewport';
import type { BaseUIComponentProps } from '@/internals/types';

/**
 * A viewport for displaying content transitions.
 * Renders a `<div>` element.
 */
export const DialogViewport = defineComponent(function DialogViewport(
  componentProps: DialogViewport.Props,
) {
  const children = toValue(componentProps.children);

  const store = useDialogRootContext(false);
  const instantType = store.useState('instantType');

  const {children: childrenToRender, state: viewportState} = usePopupViewport({
    store: store as any,
    side: undefined as any,
    children,
  });

  const state = (): DialogViewportState => ({
    activationDirection: viewportState.activationDirection,
    transitioning: viewportState.transitioning,
    instant: instantType.value as any,
  });

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;
    const stateValue = state();

    const merged: any = mergePropsN<any>([elementProps, {children: childrenToRender}]);

    if (stateValue.activationDirection) {
      merged['data-activation-direction'] = stateValue.activationDirection;
    }

    const mergedRefs = (el: HTMLDivElement | null) => {
      store.state.viewportElement = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{childrenToRender}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{childrenToRender}</div>;
  };
});

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

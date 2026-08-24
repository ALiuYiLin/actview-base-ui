import { defineComponent, toValue } from 'actview';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { useContextMenuRootContext } from '@/context-menu/root/ContextMenuRootContext';
import { REASONS } from '@/internals/reasons';

/**
 * An overlay displayed beneath the menu popup.
 * Renders a `<div>` element.
 */
export const MenuBackdrop = defineComponent(function MenuBackdrop(
  componentProps: MenuBackdrop.Props,
) {
  const children = toValue(componentProps.children);

  const {store} = useMenuRootContext();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  const contextMenuContext = useContextMenuRootContext();

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const state: MenuBackdropState = {
      open: open.value,
      transitionStatus: transitionStatus.value,
    };

    const attributes: Record<string, string> = {};
    if (state.open) {
      attributes['data-open'] = '';
    } else {
      attributes['data-closed'] = '';
    }
    if (state.transitionStatus === 'starting') {
      attributes['data-starting-style'] = '';
    } else if (state.transitionStatus === 'ending') {
      attributes['data-ending-style'] = '';
    }

    const merged: any = {
      role: 'presentation',
      hidden: !mounted.value,
      style: {
        pointerEvents: lastOpenChangeReason.value === REASONS.triggerHover ? 'none' : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      },
      ...elementProps,
      ...attributes,
    };

    const mergedRefs = (el: HTMLDivElement | null) => {
      if (contextMenuContext?.backdropRef) {
        contextMenuContext.backdropRef.value = el;
      }
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: mergedRefs} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{children}</div>;
  };
});

export interface MenuBackdropState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface MenuBackdropProps extends BaseUIComponentProps<'div', MenuBackdropState> {}

export namespace MenuBackdrop {
  export type State = MenuBackdropState;
  export type Props = MenuBackdropProps;
}

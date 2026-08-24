import { defineComponent, toValue } from 'actview';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { REASONS } from '@/internals/reasons';

/**
 * An overlay displayed beneath the preview-card popup.
 * Renders a `<div>` element.
 */
export const PreviewCardBackdrop = defineComponent(function PreviewCardBackdrop(
  componentProps: PreviewCardBackdrop.Props,
) {
  const children = toValue(componentProps.children);

  const store = usePreviewCardRootContext(false);
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('openChangeReason');

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const state: PreviewCardBackdropState = {
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
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        
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

export interface PreviewCardBackdropState {
  /**
   * Whether the preview-card is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PreviewCardBackdropProps extends BaseUIComponentProps<'div', PreviewCardBackdropState> {
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardBackdrop {
  export type State = PreviewCardBackdropState;
  export type Props = PreviewCardBackdropProps;
}

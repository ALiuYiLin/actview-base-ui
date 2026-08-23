import { popupStateMapping } from './popupStateMapping';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

interface UsePositionerOptions {
  styles: any;
  transitionStatus: TransitionStatus;
  props?: any | undefined;
  refs?: any[] | undefined;
  hidden?: boolean | undefined;
  inert?: boolean | undefined;
}

/**
 * Renders the shared outer Positioner element used by popup components.
 * (actview 版：直接构造元素，替代 useRenderElement。)
 */
export function usePositioner<State extends Record<string, any>>(
  componentProps: any,
  state: State,
  {styles, transitionStatus, props, refs, hidden, inert = false}: UsePositionerOptions,
) {
  const style: any = {...(styles.value ?? styles)};

  if (inert) {
    style.pointerEvents = 'none';
  }

  return () => {
    const {render, className, style: styleProp, ...elementProps} = componentProps;
    const stateValue = toState(state);

    const attributes: Record<string, string> = {};
    const mapping: any = popupStateMapping;
    for (const key of ['open', 'anchorHidden'] as const) {
      const value = stateValue[key];
      if (value === true) {
        attributes[`data-${key}`] = '';
      } else if (key === 'open' && !value) {
        attributes['data-closed'] = '';
      }
    }

    const merged: any = {
      role: 'presentation',
      hidden,
      style: {...style, ...(styleProp ?? {})},
      ...elementProps,
      ...attributes,
    };

    Object.assign(merged, getDisabledMountTransitionStyles(transitionStatus));

    if (props) {
      Object.assign(merged, typeof props === 'function' ? props(merged) : props);
    }

    const mergedRefs = (el: HTMLElement | null) => {
      for (const r of refs ?? []) {
        if (typeof r === 'function') {
          r(el);
        } else if (r) {
          r.value = el;
          r.current = el;
        }
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
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{componentProps.children}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{componentProps.children}</div>;
  };
}

function toState<State extends Record<string, any>>(state: State): State {
  return (state as any).value ?? state;
}

import { toValue } from 'actview';
import { popupStateMapping } from './popupStateMapping';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

interface UsePositionerOptions {
  styles: any;
  transitionStatus: any;
  props?: any | undefined;
  refs?: any[] | undefined;
  hidden?: boolean | any | undefined;
  inert?: boolean | any | undefined;
}

/**
 * Renders the shared outer Positioner element used by popup components.
 * (actview 版：直接构造元素；hidden/inert/styles 在渲染期 toValue 求值，
 * 支持 ref/computed——keepMounted 时 setup 快照不会过时。)
 */
export function usePositioner<State extends Record<string, any>>(
  componentProps: any,
  state: State,
  {styles, transitionStatus, props, refs, hidden, inert = false}: UsePositionerOptions,
) {
  return () => {
    const {render, className: classNameProp, style: styleProp, ...elementProps} = componentProps;
    const stateValue = toState(state);

    // className 支持 (state)=>string 函数形态（对齐 React 版 positioner）
    const classNameValue =
      typeof classNameProp === 'function' ? (classNameProp as any)(stateValue) : classNameProp;

    const style: any = {...(toValue(styles) ?? {})};

    if (toValue(inert)) {
      style.pointerEvents = 'none';
    }

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
      hidden: toValue(hidden),
      ...(classNameValue !== undefined ? {className: classNameValue} : {}),
      style: {...style, ...(styleProp ?? {})},
      ...elementProps,
      ...attributes,
    };

    Object.assign(merged, getDisabledMountTransitionStyles(toValue(transitionStatus)));

    if (props) {
      Object.assign(merged, typeof props === 'function' ? props(merged) : props);
    }

    const mergedRefs = (el: HTMLElement | null) => {
      for (const r of refs ?? []) {
        if (typeof r === 'function') {
          r(el);
        } else if (r) {
          r.value = el;
          r.value = el;
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

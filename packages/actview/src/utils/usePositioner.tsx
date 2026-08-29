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
    const {render, className: classNameProp, style: styleProp} = componentProps;
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
    // open/anchorHidden 布尔；side/align 字符串（对齐 React：positioner 输出
    // data-side/data-align，M5——之前 attributes 循环漏了这两个，tooltip/
    // popover/hover-card 用例失败根因）。
    for (const key of ['open', 'anchorHidden', 'side', 'align'] as const) {
      const value = stateValue[key];
      if (value === true) {
        attributes[`data-${key}`] = '';
      } else if (key === 'open' && !value) {
        attributes['data-closed'] = '';
      } else if (value != null && value !== false && value !== '') {
        attributes[`data-${key}`] = String(value);
      }
    }

    // style 支持字符串形态（cssText）：字符串无法与对象浅合并，直接整体覆盖
    // （否则 `{...a, ...'str'}` 展开数字索引键，core setProp 抛错）。
    const mergedStyle: any =
      typeof styleProp === 'string'
        ? styleProp
        : {...style, ...(styleProp ?? {})};

    const merged: any = {
      role: 'presentation',
      hidden: toValue(hidden),
      ...(classNameValue !== undefined ? {className: classNameValue} : {}),
      style: mergedStyle,
      ...attributes,
    };

    Object.assign(merged, getDisabledMountTransitionStyles(toValue(transitionStatus)));

    // 用户透传 props 经显式 props 参数传入（调用方构建 elementProps 时已剔除
    // 组件自定义 props——M2-原语-5：不再自动展开 componentProps rest，避免
    // side/align/sideOffset/alignOffset 裸属性泄漏到 DOM）。
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

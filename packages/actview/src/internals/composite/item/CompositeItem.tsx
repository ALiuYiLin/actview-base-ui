import { defineComponent, toValue } from 'actview';
import { useCompositeItem } from './useCompositeItem';
import {
  getStateAttributesProps,
  type StateAttributesMapping,
} from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { Ref } from 'actview';

export function CompositeItem<Metadata, State extends Record<string, any>>(
  componentProps: CompositeItem.Props<Metadata, State>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {
    state = {} as State,
    metadata,
    stateAttributesMapping,
    tag = 'div',
  } = componentProps;

  const {compositeProps, compositeRef} = useCompositeItem({metadata});

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, props = [], refs = [], children, ...elementProps} =
      componentProps;

    const stateValue = toValue(state) as State;
    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: HTMLProps = {};
    for (const prop of [compositeProps, ...props, elementProps]) {
      // props getter 接收已合并的 previousProps（React mergePropsN 语义：
      // getter 内层可读取/覆盖既有属性，如 useButton 保留外部 role）
      const resolved = typeof prop === 'function' ? prop(merged) : prop;
      Object.assign(merged, resolved);
    }
    Object.assign(merged, stateAttributes);

    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    const mergedRefs = (el: HTMLElement | null) => {
      compositeRef(el);
      for (const r of refs) {
        const resolved = typeof r === 'function' ? r : (el: HTMLElement | null) => (r.value = el);
        resolved(el);
      }
    };

    const Tag = tag as any;
    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const RenderTag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <RenderTag key={render.key} {...mergedRenderProps} ref={mergedRefs} />;
    }
    return <Tag {...merged} ref={mergedRefs}>{children}</Tag>;
  };
}

export interface CompositeItemState {}

export interface CompositeItemProps<Metadata, State extends Record<string, any>>
  extends Pick<BaseUIComponentProps<any, State>, 'render' | 'className' | 'style'> {
  children?: any;
  metadata?: Metadata | undefined;
  refs?: Array<((element: HTMLElement | null) => void) | Ref<HTMLElement | null>> | undefined;
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  tag?: keyof JSX.IntrinsicElements | undefined;
}

export namespace CompositeItem {
  export type State = CompositeItemState;
  export type Props<Metadata, TState extends Record<string, any>> = CompositeItemProps<
    Metadata,
    TState
  >;
}

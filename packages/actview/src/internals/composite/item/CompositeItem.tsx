import { defineComponent, unref } from '@actview/core';
import type { Ref } from '@actview/core';
import type { VNodeChild } from '@actview/jsx';
import { useCompositeItem } from './useCompositeItem';
import type { BaseUIComponentProps, RefValue } from '../../types';
import { getStateAttributesProps, type StateAttributesMapping } from '../../getStateAttributesProps';
import { mergePropsN } from '@base-ui/actview/merge-props';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';

export const CompositeItem = defineComponent(function <
  Metadata,
  State extends Record<string, any>,
>(componentProps: CompositeItem.Props<Metadata, State>) {
  const { compositeProps, compositeRef } = useCompositeItem({
    metadata: componentProps.metadata,
  });

  return () => {
    const {
      render,
      className,
      style,
      state,
      props: extraProps,
      metadata: _metadata, // 已由 useCompositeItem 使用
      stateAttributesMapping,
      tag,
      ...elementProps
    } = componentProps;

    const resolvedState = (unref(state) ?? EMPTY_OBJECT) as State;

    // state → data-* 属性（单值映射，对齐 Base UI 契约：mapping[key](state[key])）
    const stateAttributes = getStateAttributesProps(resolvedState, stateAttributesMapping);

    const merged = mergePropsN([
      compositeProps,
      stateAttributes,
      ...(extraProps ?? []),
      elementProps,
    ]);

    if (typeof render === 'function') {
      return render({ ...merged, ...resolvedState, ref: compositeRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={compositeRef} />;
    }
    return <component is={tag ?? 'div'} {...merged} ref={compositeRef} />;
  };
}) as <Metadata, State extends Record<string, any>>(
  props: CompositeItem.Props<Metadata, State>,
) => any;

export interface CompositeItemState {}

export interface CompositeItemProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<any, State>,
  'render' | 'className' | 'style'
> {
  children?: VNodeChild;
  metadata?: Metadata | undefined;
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | Ref<State> | undefined;
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

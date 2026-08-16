import { EMPTY_OBJECT, EMPTY_ARRAY } from '@base-ui/actview-utils/empty';
import type { Ref } from '@actview/core';
import type { VNodeChild } from '@actview/jsx';
import { useRenderElement } from '../../useRenderElement';
import { useCompositeItem } from './useCompositeItem';
import type { BaseUIComponentProps, RefValue } from '../../types';
import { StateAttributesMapping } from '../../getStateAttributesProps';

const COMPOSITE_ITEM_ELEMENT_PROPS_EXCLUDED = new Set([
  'render',
  'className',
  'style',
  'state',
  'props',
  'refs',
  'metadata',
  'stateAttributesMapping',
  'tag',
]);

export function CompositeItem<Metadata, State extends Record<string, any>>(
  componentProps: CompositeItem.Props<Metadata, State>,
) {
  const { compositeProps, compositeRef } = useCompositeItem({ metadata: componentProps.metadata });

  const getElementProps = () => {
    const rest: Record<string, any> = {};
    for (const key in componentProps) {
      if (!COMPOSITE_ITEM_ELEMENT_PROPS_EXCLUDED.has(key)) {
        rest[key] = (componentProps as Record<string, any>)[key];
      }
    }
    return rest;
  };

  const getElement = useRenderElement(componentProps.tag ?? 'div', componentProps, {
    state: componentProps.state ?? EMPTY_OBJECT,
    // The composite ref attaches first so an outer item wins when nested items share a DOM node.
    ref: [compositeRef, ...(componentProps.refs ?? EMPTY_ARRAY)] as RefValue<Element>[],
    props: [compositeProps, ...(componentProps.props ?? EMPTY_ARRAY), getElementProps],
    stateAttributesMapping: componentProps.stateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface CompositeItemState {}

export interface CompositeItemProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<any, State>,
  'render' | 'className' | 'style'
> {
  children?: VNodeChild;
  metadata?: Metadata | undefined;
  refs?: RefValue<HTMLElement | null>[] | undefined;
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

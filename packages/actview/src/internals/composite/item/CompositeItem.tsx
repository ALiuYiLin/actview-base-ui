import { defineComponent, toValue } from 'actview';
import { useCompositeItem } from './useCompositeItem';
import { useRenderElement } from '@/internals/useRenderElement';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '@/internals/types';
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

    const {element} = useRenderElement({
      props: () => [compositeProps, ...props, elementProps],
      state: stateValue,
      stateAttributesMapping: stateAttributesMapping ?? {},
      className: () => className,
      style: () => style,
      render: () => render,
      refs: () => [compositeRef, ...refs],
      children: () => children,
      defaultTag: () => tag,
    });
    return element();
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

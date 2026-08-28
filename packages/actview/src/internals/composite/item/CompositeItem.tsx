import { computed, toRefs } from 'actview';
import { useCompositeItem } from './useCompositeItem';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import type { Ref } from 'actview';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '@/internals/types';

export function CompositeItem<Metadata, State extends Record<string, any>>(
  componentProps: CompositeItem.Props<Metadata, State>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // state/stateAttributesMapping 渲染期经 toRefs 活引用读取（setup 解构是
  // 快照——state 更新后 data-* 不会重算，PD-15）。
  const { metadata, tag = 'div' } = componentProps;

  const { compositeProps, compositeRef } = useCompositeItem({ metadata });

  // 值形 props toRefs 活引用；refs 选项（ref 数组）随 toRefs 活引用透传；
  // children 不解构、随 elementRefs 流入渲染元素。
  const {
    render,
    className,
    style,
    props: propsRef,
    refs: refsRef,
    state: stateRef,
    stateAttributesMapping: mappingRef,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        tag,
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: stateRef?.value as State | undefined,
          stateAttributesMapping: mappingRef?.value,
          ref: useMergedRefs(compositeRef, ...(refsRef?.value ?? [])),
          props: [compositeProps, ...(propsRef?.value ?? []), elementProps.value],
        },
      )}
    </>
  );
}

export interface CompositeItemState {}

export interface CompositeItemProps<Metadata, State extends Record<string, any>>
  extends Pick<BaseUIComponentProps<any, State>, 'render' | 'className' | 'style'> {
  children?: any;
  metadata?: Metadata | undefined;
  refs?: Array<((element: HTMLElement | null) => void) | Ref<HTMLElement | null>> | undefined;
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | Ref<State | undefined> | (() => State | undefined) | undefined;
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

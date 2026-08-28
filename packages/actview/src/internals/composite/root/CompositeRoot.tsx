import { computed, toRefs } from 'actview';
import { rawRef } from 'actview';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import { useCompositeRoot } from './useCompositeRoot';
import { CompositeRootContext } from './CompositeRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
import type { ModifierKey } from '@/internals/composite/composite';
import type { CompositeGridNavigator } from './gridNavigation';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { Ref } from 'actview';

export function CompositeRoot<Metadata extends {}, State extends Record<string, any>>(
  componentProps: CompositeRoot.Props<Metadata, State>,
) {
  // ============ setup（只执行一次）：一次性初始化（配置 props 快照语义）============
  const {
    highlightedIndex: highlightedIndexProp,
    onHighlightedIndexChange: onHighlightedIndexChangeProp,
    orientation,
    grid,
    loopFocus,
    onLoop,
    enableHomeAndEndKeys,
    onMapChange: onMapChangeProp,
    stopEventPropagation = true,
    rootRef: rootRefProp,
    disabledIndices,
    modifierKeys,
    highlightItemOnHover = false,
  } = componentProps;

  const direction = useDirection().value;

  const {
    props: defaultProps,
    highlightedIndex,
    onHighlightedIndexChange,
    elementsRef,
    onMapChange: onMapChangeUnwrapped,
    relayKeyboardEvent,
  } = useCompositeRoot({
    grid,
    loopFocus,
    onLoop,
    orientation,
    highlightedIndex: highlightedIndexProp,
    onHighlightedIndexChange: onHighlightedIndexChangeProp as any,
    rootRef: rootRefProp,
    stopEventPropagation,
    enableHomeAndEndKeys,
    direction,
    disabledIndices,
    modifierKeys,
  });

  // store-as-is 载体：身份稳定 getter 对象（highlightedIndex 实时——键盘导航时
  // CompositeItem 的 tabIndex/onFocus 拿到实时值；provide 只跑一次，每次渲染
  // 新对象会冻结快照）。
  const contextValue: CompositeRootContext = {
    get highlightedIndex() {
      return highlightedIndex.value;
    },
    onHighlightedIndexChange,
    highlightItemOnHover,
    relayKeyboardEvent,
  };

  // 值形 props toRefs 活引用；composite 专用键全部解构排除（children 不排除、
  // 随 elementRefs 流入渲染元素）。
  const {
    render,
    className,
    style,
    props: propsRef,
    tag: tagRef,
    state: stateRef,
    stateAttributesMapping: mappingRef,
    refs: refsRef,
    refToRender: _refToRender,
    onKeyDown: _onKeyDown,
    stopEventPropagation: _sep,
    rootRef: _rootRef,
    disabledIndices: _di,
    modifierKeys: _mk,
    highlightItemOnHover: _hioh,
    highlightedIndex: _hi,
    onHighlightedIndexChange: _ohic,
    orientation: _o,
    grid: _g,
    loopFocus: _lf,
    onLoop: _ol,
    enableHomeAndEndKeys: _ehek,
    onMapChange: _omc,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 新签名 hook：ref 合并链内建（refs 选项 + defaultProps.ref 全部广播）——
  // 原 extraRefs/refToRender 特判由合并链统一承担。
  return (
    <CompositeRootContext.Provider value={contextValue}>
      <CompositeList
        elementsRef={rawRef(elementsRef)}
        onMapChange={(newMap: Map<Element, CompositeMetadata<Metadata>>) => {
          onMapChangeProp?.(newMap);
          onMapChangeUnwrapped(newMap);
        }}
      >
        {useRenderElement(
          tagRef?.value ?? 'div',
          {
            className: className?.value,
            render: render?.value,
            style: style?.value,
          },
          {
            state: stateRef?.value as State | undefined,
            stateAttributesMapping: mappingRef?.value,
            ref: useMergedRefs(...(refsRef?.value ?? []), (defaultProps as any).ref ?? undefined),
            props: [...(propsRef?.value ?? []), elementProps.value, defaultProps],
          },
        )}
      </CompositeList>
    </CompositeRootContext.Provider>
  );
}

export interface CompositeRootState {}

export interface CompositeRootProps<Metadata, State extends Record<string, any>>
  extends Pick<BaseUIComponentProps<'div', State>, 'render' | 'className' | 'children' | 'style'> {
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  refs?: Array<((element: HTMLElement | null) => void) | Ref<HTMLElement | null>> | undefined;
  tag?: keyof JSX.IntrinsicElements | undefined;
  orientation?: 'horizontal' | 'vertical' | 'both' | undefined;
  grid?: CompositeGridNavigator | undefined;
  loopFocus?: boolean | undefined;
  onLoop?:
    | ((
        event: any,
        prevIndex: number,
        nextIndex: number,
        elementsRef: Ref<Array<HTMLElement | null>>,
      ) => number)
    | undefined;
  highlightedIndex?: number | undefined;
  onHighlightedIndexChange?: ((index: number) => void) | undefined;
  enableHomeAndEndKeys?: boolean | undefined;
  onMapChange?: ((newMap: Map<Node, CompositeMetadata<Metadata>>) => void) | undefined;
  onKeyDown?: ((event: any) => void) | undefined;
  stopEventPropagation?: boolean | undefined;
  rootRef?: ((element: HTMLElement | null) => void) | undefined;
  disabledIndices?: number[] | undefined;
  modifierKeys?: ModifierKey[] | undefined;
  highlightItemOnHover?: boolean | undefined;
  /**
   * 是否向 render 函数形式传递 `ref`。
   * 新签名 hook 的 ref 合并链恒向 render 函数传递合并链 ref——此 prop 保留
   * 兼容旧调用方（ToggleGroup），运行时为 no-op。
   */
  refToRender?: boolean | undefined;
}

export namespace CompositeRoot {
  export type State = CompositeRootState;
  export type Props<Metadata, TState extends Record<string, any>> = CompositeRootProps<
    Metadata,
    TState
  >;
}

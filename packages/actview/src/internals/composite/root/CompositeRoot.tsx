import { defineComponent, rawRef, toValue, computed } from 'actview';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import { useCompositeRoot } from './useCompositeRoot';
import { CompositeRootContext } from './CompositeRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import type { ModifierKey } from '@/internals/composite/composite';
import type { CompositeGridNavigator } from './gridNavigation';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { Ref } from 'actview';

export function CompositeRoot<Metadata extends {}, State extends Record<string, any>>(
  componentProps: CompositeRoot.Props<Metadata, State>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {
    refs = [],
    highlightedIndex: highlightedIndexProp,
    onHighlightedIndexChange: onHighlightedIndexChangeProp,
    orientation,
    grid,
    loopFocus,
    onLoop,
    enableHomeAndEndKeys,
    onMapChange: onMapChangeProp,
    stopEventPropagation = true,
    rootRef,
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
    highlightedIndex: toValue(highlightedIndexProp),
    onHighlightedIndexChange: onHighlightedIndexChangeProp as any,
    rootRef,
    stopEventPropagation,
    enableHomeAndEndKeys,
    direction,
    disabledIndices: toValue(disabledIndices),
    modifierKeys: toValue(modifierKeys),
  });

  // contextValue 用 computed：highlightedIndex 是 computed ref——internal 变化
  // （键盘导航）时消费方（CompositeItem 的 tabIndex/onFocus）拿到实时值。
  // （setup 快照值 → context 永远初始值 → roving tabindex 不更新。）
  const contextValue = computed<CompositeRootContext>(() => ({
    highlightedIndex: highlightedIndex.value,
    onHighlightedIndexChange,
    highlightItemOnHover,
    relayKeyboardEvent,
  }));

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  // state/stateAttributesMapping 渲染期解构（setup 解构是快照——state 更新
  // 后 data-* 不会重算）。
  return () => {
    const {
      render,
      className,
      style,
      props = [],
      tag = 'div',
      children,
      state: stateProp,
      stateAttributesMapping: stateAttributesMappingProp,
      refToRender,
      refs: refsProp,
      highlightedIndex: _hi,
      onHighlightedIndexChange: _ohic,
      orientation: _o,
      grid: _g,
      loopFocus: _lf,
      onLoop: _ol,
      enableHomeAndEndKeys: _ehek,
      onMapChange: _omc,
      onKeyDown: _okd,
      stopEventPropagation: _sep,
      rootRef: _rr,
      disabledIndices: _di,
      modifierKeys: _mk,
      highlightItemOnHover: _hioh,
      ...elementProps
    } = componentProps;

    const stateValue = toValue(stateProp) as State;

    const {element} = useRenderElement({
      props: () => [...props, elementProps, defaultProps],
      state: stateValue,
      stateAttributesMapping: stateAttributesMappingProp ?? {},
      className: () => className,
      style: () => style,
      render: () => render,
      refs: () => refsProp ?? [],
      children: () => children,
      defaultTag: () => tag,
      // 原实现 render 函数形式不带 ref（与全库其他组件不同），保持默认
      // 行为；个别组件（如 ToggleGroup 对齐 React 契约）传 `refToRender`
      // 开启 render 函数分支的 ref 传递。
      refToRender: refToRender === undefined ? false : refToRender,
    });

    return (
      <CompositeRootContext.Provider value={contextValue.value as any}>
        <CompositeList
          elementsRef={rawRef(elementsRef)}
          onMapChange={(newMap: Map<Element, CompositeMetadata<Metadata>>) => {
            onMapChangeProp?.(newMap);
            onMapChangeUnwrapped(newMap);
          }}
        >
          {/* extraRefs 传递 defaultProps.ref（useCompositeRoot 的 mergedRef，设置
              rootRef）：useRenderElement 的 JSX `ref={mergedRefs}` 只合并 refs
              数组，defaultProps.ref 会被覆盖丢失 → rootRef.value 永远 null →
              键盘导航提前 return。extraRefs 不参与 render 分支的单一 ref 判断，
              不影响 render prop 的 ref 形态。 */}
          {element((defaultProps as any).ref ? [(defaultProps as any).ref] : undefined)}
        </CompositeList>
      </CompositeRootContext.Provider>
    );
  };
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
   * 是否向 render 函数形式传递 `ref`（mergedRefs / 单 Ref 对象）。
   * 默认 `false`（原实现行为）；对齐 React 契约的组件（如 ToggleGroup）传 `true`。
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

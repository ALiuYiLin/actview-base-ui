import { computed, defineComponent, ref, unref } from 'actview';
import type { Ref } from '@actview/core';
import type { VNodeChild } from '@actview/jsx';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { CompositeList, type CompositeMetadata } from '../list/CompositeList';
import { useCompositeRoot } from './useCompositeRoot';
import { CompositeRootContext } from './CompositeRootContext';
import type { BaseUIComponentProps, BaseUIEvent, MaybeRef } from '../../types';
import type { ModifierKey } from '../composite';
import type { CompositeGridNavigator } from './gridNavigation';
import { useDirection } from '../../direction-context/DirectionContext';
import { getStateAttributesProps, type StateAttributesMapping } from '../../getStateAttributesProps';
import { mergePropsN } from '../../../merge-props';

export const CompositeRoot = defineComponent(function <
  Metadata extends {},
  State extends Record<string, any>,
>(componentProps: CompositeRoot.Props<Metadata, State>) {
  // ================= setup（只执行一次） =================
  const direction = useDirection();
  // 根元素 ref：CompositeRoot 的根是 Provider/List 包裹，useRootElement 拿不到
  // 实际元素，故用 ref() + 显式模板 ref 挂到渲染元素（defaultProps.ref 链）。
  const rootRef = ref<HTMLElement | null>(null);

  const {
    props: defaultProps,
    highlightedIndex,
    onHighlightedIndexChange,
    elementsRef,
    onMapChange: onMapChangeUnwrapped,
    relayKeyboardEvent,
  } = useCompositeRoot({
    grid: componentProps.grid,
    loopFocus: componentProps.loopFocus,
    onLoop: componentProps.onLoop,
    orientation: componentProps.orientation,
    highlightedIndex: componentProps.highlightedIndex,
    onHighlightedIndexChange: componentProps.onHighlightedIndexChange,
    rootRef,
    stopEventPropagation: componentProps.stopEventPropagation ?? true,
    enableHomeAndEndKeys: componentProps.enableHomeAndEndKeys,
    direction: direction.value,
    disabledIndices: componentProps.disabledIndices,
    modifierKeys: componentProps.modifierKeys,
  });

  const contextValue = computed(() => ({
    highlightedIndex: highlightedIndex.value,
    onHighlightedIndexChange,
    highlightItemOnHover: componentProps.highlightItemOnHover ?? false,
    relayKeyboardEvent,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      state,
      props: extraProps,
      stateAttributesMapping,
      tag,
      children: _children, // children 由 CompositeList 渲染
      orientation: _orientation, // useCompositeRoot 已接管
      loopFocus: _loopFocus, // useCompositeRoot 已接管
      highlightedIndex: _highlightedIndex, // useCompositeRoot 已接管
      onHighlightedIndexChange: _onHighlightedIndexChange, // useCompositeRoot 已接管
      grid: _grid, // useCompositeRoot 已接管
      onLoop: _onLoop, // useCompositeRoot 已接管
      enableHomeAndEndKeys: _enableHomeAndEndKeys, // useCompositeRoot 已接管
      onMapChange: _onMapChange, // 已在下方包装
      stopEventPropagation: _stopEventPropagation, // useCompositeRoot 已接管
      disabledIndices: _disabledIndices, // useCompositeRoot 已接管
      modifierKeys: _modifierKeys, // useCompositeRoot 已接管
      highlightItemOnHover: _highlightItemOnHover, // 已进 contextValue
      ...elementProps
    } = componentProps;

    const resolvedState = (unref(state) ?? EMPTY_OBJECT) as State;

    // state → data-* 属性（单值映射，对齐 Base UI 契约）
    const stateAttributes = getStateAttributesProps(resolvedState, stateAttributesMapping);

    const merged = mergePropsN([defaultProps, ...(extraProps ?? []), stateAttributes, elementProps]);
    console.log('[PROBE-CR] merged aria-labelledby=', merged['aria-labelledby'], 'hasKey=', 'aria-labelledby' in merged);

    const element = (() => {
      if (typeof render === 'function') {
        return render({ ...merged, ...resolvedState, ref: rootRef });
      }
      if (render) {
        const Tag = render.type as any;
        return <Tag key={render.key} {...render.props} {...merged} />;
      }
      return <component is={tag ?? 'div'} {...merged} />;
    })();

    return (
      <CompositeRootContext.Provider value={contextValue.value}>
        <CompositeList<Metadata>
          elementsRef={elementsRef}
          onMapChange={(newMap) => {
            componentProps.onMapChange?.(newMap);
            onMapChangeUnwrapped(newMap);
          }}
        >
          {element}
        </CompositeList>
      </CompositeRootContext.Provider>
    );
  };
}) as <Metadata extends {}, State extends Record<string, any>>(
  props: CompositeRoot.Props<Metadata, State>,
) => any;

export interface CompositeRootState {}

export interface CompositeRootProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<any, State>,
  'render' | 'className' | 'style'
> {
  children?: VNodeChild;
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | Ref<State> | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  tag?: keyof JSX.IntrinsicElements | undefined;
  orientation?: 'horizontal' | 'vertical' | 'both' | undefined;
  grid?: CompositeGridNavigator | undefined;
  loopFocus?: boolean | undefined;
  onLoop?:
    | ((
        event: KeyboardEvent,
        prevIndex: number,
        nextIndex: number,
        elementsRef: { current: Array<HTMLElement | null> },
      ) => number)
    | undefined;
  highlightedIndex?: MaybeRef<number | undefined> | undefined;
  onHighlightedIndexChange?: ((index: number) => void) | undefined;
  enableHomeAndEndKeys?: boolean | undefined;
  onMapChange?: ((newMap: Map<Node, CompositeMetadata<Metadata>>) => void) | undefined;
  onKeyDown?: ((event: BaseUIEvent<KeyboardEvent>) => void) | undefined;
  stopEventPropagation?: boolean | undefined;
  disabledIndices?: MaybeRef<number[] | undefined> | undefined;
  modifierKeys?: ModifierKey[] | undefined;
  highlightItemOnHover?: boolean | undefined;
}

export namespace CompositeRoot {
  export type State = CompositeRootState;
  export type Props<Metadata, TState extends Record<string, any>> = CompositeRootProps<
    Metadata,
    TState
  >;
}

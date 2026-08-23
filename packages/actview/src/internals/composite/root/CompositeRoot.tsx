import { defineComponent, toValue } from 'actview';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import { useCompositeRoot } from './useCompositeRoot';
import { CompositeRootContext } from './CompositeRootContext';
import type { HTMLProps, BaseUIComponentProps } from '@/internals/types';
import type { ModifierKey } from '@/internals/composite/composite';
import type { CompositeGridNavigator } from './gridNavigation';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { getStateAttributesProps, StateAttributesMapping } from '@/internals/getStateAttributesProps';

export function CompositeRoot<Metadata extends {}, State extends Record<string, any>>(
  componentProps: CompositeRoot.Props<Metadata, State>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const {
    refs = [],
    state = {} as State,
    stateAttributesMapping,
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

  const contextValue: CompositeRootContext = {
    highlightedIndex,
    onHighlightedIndexChange,
    highlightItemOnHover,
    relayKeyboardEvent,
  };

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, props = [], tag = 'div', children, ...elementProps} =
      componentProps;

    const stateValue = toValue(state) as State;
    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: HTMLProps = {};
    for (const prop of [...props, elementProps]) {
      const resolved = typeof prop === 'function' ? prop() : prop;
      Object.assign(merged, resolved);
    }
    Object.assign(merged, defaultProps, stateAttributes);

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

    const Tag = tag as any;
    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue});
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const RenderTag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <RenderTag key={render.key} {...mergedRenderProps} />;
      }
    } else {
      element = <Tag {...merged}>{children}</Tag>;
    }

    return (
      <CompositeRootContext.Provider value={contextValue as any}>
        <CompositeList
          elementsRef={elementsRef}
          onMapChange={(newMap: Map<Element, CompositeMetadata<Metadata>>) => {
            onMapChangeProp?.(newMap);
            onMapChangeUnwrapped(newMap);
          }}
        >
          {element}
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
  refs?: Array<((element: HTMLElement | null) => void) | {current: HTMLElement | null}> | undefined;
  tag?: keyof JSX.IntrinsicElements | undefined;
  orientation?: 'horizontal' | 'vertical' | 'both' | undefined;
  grid?: CompositeGridNavigator | undefined;
  loopFocus?: boolean | undefined;
  onLoop?:
    | ((
        event: any,
        prevIndex: number,
        nextIndex: number,
        elementsRef: {current: Array<HTMLElement | null>},
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
}

export namespace CompositeRoot {
  export type State = CompositeRootState;
  export type Props<Metadata, TState extends Record<string, any>> = CompositeRootProps<
    Metadata,
    TState
  >;
}

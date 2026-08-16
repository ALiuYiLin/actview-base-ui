import { computed } from 'actview';
import type { Ref } from '@actview/core';
import type { VNodeChild } from '@actview/jsx';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { CompositeList, type CompositeMetadata } from '../list/CompositeList';
import { useCompositeRoot } from './useCompositeRoot';
import { CompositeRootContext } from './CompositeRootContext';
import { useRenderElement } from '../../useRenderElement';
import type { BaseUIComponentProps, BaseUIEvent, RefValue } from '../../types';
import type { ModifierKey } from '../composite';
import type { CompositeGridNavigator } from './gridNavigation';
import { useDirection } from '../../direction-context/DirectionContext';
import { StateAttributesMapping } from '../../getStateAttributesProps';

const COMPOSITE_ROOT_ELEMENT_PROPS_EXCLUDED = new Set([
  'render',
  'className',
  'style',
  'refs',
  'props',
  'state',
  'stateAttributesMapping',
  'highlightedIndex',
  'onHighlightedIndexChange',
  'orientation',
  'grid',
  'loopFocus',
  'onLoop',
  'enableHomeAndEndKeys',
  'onMapChange',
  'stopEventPropagation',
  'rootRef',
  'disabledIndices',
  'modifierKeys',
  'highlightItemOnHover',
  'tag',
]);

export function CompositeRoot<Metadata extends {}, State extends Record<string, any>>(
  componentProps: CompositeRoot.Props<Metadata, State>,
) {
  const direction = useDirection();

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
    rootRef: componentProps.rootRef,
    stopEventPropagation: componentProps.stopEventPropagation ?? true,
    enableHomeAndEndKeys: componentProps.enableHomeAndEndKeys,
    direction: direction.value,
    disabledIndices: componentProps.disabledIndices,
    modifierKeys: componentProps.modifierKeys,
  });

  const getElementProps = () => {
    const rest: Record<string, any> = {};
    for (const key in componentProps) {
      if (!COMPOSITE_ROOT_ELEMENT_PROPS_EXCLUDED.has(key)) {
        rest[key] = (componentProps as Record<string, any>)[key];
      }
    }
    return rest;
  };

  const getElement = useRenderElement(componentProps.tag ?? 'div', componentProps, {
    state: componentProps.state ?? EMPTY_OBJECT,
    ref: (componentProps.refs ?? EMPTY_ARRAY) as RefValue<Element>[],
    props: [defaultProps, ...(componentProps.props ?? EMPTY_ARRAY), getElementProps],
    stateAttributesMapping: componentProps.stateAttributesMapping,
  });

  const contextValue = computed(() => ({
    highlightedIndex: highlightedIndex.value,
    onHighlightedIndexChange,
    highlightItemOnHover: componentProps.highlightItemOnHover ?? false,
    relayKeyboardEvent,
  }));

  return (
    <CompositeRootContext.Provider value={contextValue}>
      <CompositeList<Metadata>
        elementsRef={elementsRef}
        onMapChange={(newMap) => {
          componentProps.onMapChange?.(newMap);
          onMapChangeUnwrapped(newMap);
        }}
      >
        {getElement()}
      </CompositeList>
    </CompositeRootContext.Provider>
  );
}

export interface CompositeRootState {}

export interface CompositeRootProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<any, State>,
  'render' | 'className' | 'style'
> {
  children?: VNodeChild;
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | Ref<State> | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  refs?: RefValue<HTMLElement | null>[] | undefined;
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
  highlightedIndex?: number | undefined;
  onHighlightedIndexChange?: ((index: number) => void) | undefined;
  enableHomeAndEndKeys?: boolean | undefined;
  onMapChange?: ((newMap: Map<Node, CompositeMetadata<Metadata>>) => void) | undefined;
  onKeyDown?: ((event: BaseUIEvent<KeyboardEvent>) => void) | undefined;
  stopEventPropagation?: boolean | undefined;
  rootRef?: RefValue<HTMLElement | null> | undefined;
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

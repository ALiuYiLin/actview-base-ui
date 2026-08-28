import {onUnmounted, ref} from 'actview';
import type { CompositeListContextValue, CompositeListRegistration } from './CompositeListContext';
import { CompositeListContext } from './CompositeListContext';
import type { Ref } from 'actview';

export type CompositeMetadata<CustomMetadata> = {
  index: number;
} & CustomMetadata;

interface CompositeListItem<Metadata> {
  index: number;
  element: HTMLElement;
  registration: CompositeListRegistration<Metadata>;
}

/**
 * Provides context for a list of items in a composite component.
 * (actview 转译版：保留 register/unregister/syncRefs/flush 核心，
 * 省略 MutationObserver 重排监听——Accordion 场景的 item 静态排序，
 * 注册/注销时同步 flush 重建索引即可。)
 */
export function CompositeList(componentProps: CompositeList.Props<any>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const listeners = new Set<Function>();
  const map = new Map<Element, CompositeListRegistration<any>>();
  const nextIndexRef = ref(0);
  let itemsRef: readonly CompositeListItem<any>[] | null = null;

  const syncRefs = (items: readonly CompositeListItem<any>[]) => {
    const nextMap = new Map<Element, CompositeMetadata<any>>();
    const elementsRefProp = componentProps.elementsRef;
    const elementsRef = (
      typeof elementsRefProp === 'function' ? elementsRefProp() : elementsRefProp
    ).value as (HTMLElement | null)[];
    const labelsRefProp = componentProps.labelsRef;
    const labelsRef = labelsRefProp
      ? (typeof labelsRefProp === 'function' ? labelsRefProp() : labelsRefProp).value
      : undefined;

    elementsRef.length = 0;
    if (labelsRef) {
      labelsRef.length = 0;
    }

    items.forEach((item) => {
      nextMap.set(item.element, {
        ...(item.registration.metadata ?? ({} as any)),
        index: item.index,
      });

      elementsRef[item.index] = item.element;

      if (labelsRef) {
        labelsRef[item.index] =
          item.registration.label !== undefined
            ? item.registration.label
            : (item.registration.textRef?.value?.textContent ?? item.element.textContent);
      }
    });

    nextIndexRef.value = elementsRef.length;

    return nextMap;
  };

  const flush = () => {
    const [items] = getCompositeListSnapshot(map);
    const nextMap = syncRefs(items);

    const previousItems = itemsRef;
    const changed =
      !previousItems ||
      previousItems.length !== items.length ||
      items.some((item, index) => {
        const previousItem = previousItems[index];
        return (
          item.index !== previousItem.index ||
          item.element !== previousItem.element ||
          item.registration.index !== previousItem.registration.index ||
          item.registration.metadata !== previousItem.registration.metadata
        );
      });

    itemsRef = items;

    if (!changed) {
      return;
    }

    listeners.forEach((listener) => listener(nextMap));
    // onMapChange 是函数 prop——直接调用
    componentProps.onMapChange?.(nextMap);
  };

  const register = (node: Element, registration: CompositeListRegistration<any>) => {
    map.set(node, registration);
    flush();
  };

  const unregister = (node: Element) => {
    map.delete(node);
    flush();
  };

  const subscribeMapChange = (fn: (map: Map<Element, any>) => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  };

  onUnmounted(() => {
    const elementsRefProp = componentProps.elementsRef;
    const elementsRef = (
      typeof elementsRefProp === 'function' ? elementsRefProp() : elementsRefProp
    ).value as (HTMLElement | null)[];
    elementsRef.length = 0;
    const labelsRefProp = componentProps.labelsRef;
    const labelsRef = labelsRefProp
      ? (typeof labelsRefProp === 'function' ? labelsRefProp() : labelsRefProp).value
      : undefined;
    if (labelsRef) {
      labelsRef.length = 0;
    }
  });

  const contextValue: CompositeListContextValue<any> = {
    register,
    unregister,
    subscribeMapChange,
    nextIndexRef,
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 渲染期直读（props 代理，每次渲染最新）。
  return (
    <CompositeListContext.Provider value={contextValue}>
      {componentProps.children}
    </CompositeListContext.Provider>
  );
}

function getCompositeListSnapshot<Metadata>(
  map: Map<Element, CompositeListRegistration<Metadata>>,
) {
  const reservedIndices = new Set<number>();
  const items: CompositeListItem<Metadata>[] = [];
  const automaticItems: CompositeListItem<Metadata>[] = [];

  map.forEach((registration, node) => {
    if (!node.isConnected) {
      return;
    }

    const index = registration.index;
    const item = {
      index: index ?? -1,
      element: node as HTMLElement,
      registration,
    };

    if (index === null) {
      automaticItems.push(item);
    } else if (index >= 0) {
      reservedIndices.add(index);
      items.push(item);
    }
  });

  let nextAutomaticIndex = 0;
  automaticItems.sort((a, b) => sortByDocumentPosition(a.element, b.element));

  automaticItems.forEach((item) => {
    while (reservedIndices.has(nextAutomaticIndex)) {
      nextAutomaticIndex += 1;
    }

    item.index = nextAutomaticIndex;
    items.push(item);
    nextAutomaticIndex += 1;
  });

  if (reservedIndices.size > 0) {
    items.sort((a, b) => a.index - b.index);
  }

  return [items, automaticItems.map((item) => item.element)] as const;
}

function sortByDocumentPosition(a: Element, b: Element) {
  // `DOCUMENT_POSITION_CONTAINED_BY` is always reported alongside `FOLLOWING`, and `CONTAINS`
  // alongside `PRECEDING`, so testing `FOLLOWING` alone orders siblings and nested items alike.
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

export interface CompositeListState {}

export interface CompositeListProps<Metadata> {
  children: any;
  /**
   * A ref to the list of HTML elements, ordered by their index.
   * Explicit indexes can leave empty slots in the array.
   * `useListNavigation`'s `listRef` prop.
   */
  elementsRef: Ref<(HTMLElement | null)[]> | (() => Ref<(HTMLElement | null)[]>);
  /**
   * A ref to the list of element labels, ordered by their index.
   * `useTypeahead`'s `listRef` prop.
   */
  labelsRef?:
    | Ref<(string | null)[]>
    | (() => Ref<(string | null)[]>)
    | undefined;
  onMapChange?: ((newMap: Map<Element, CompositeMetadata<Metadata>>) => void) | undefined;
}

export namespace CompositeList {
  export type State = CompositeListState;
  export type Props<Metadata> = CompositeListProps<Metadata>;
}

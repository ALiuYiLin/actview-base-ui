import {onUnmounted, ref, toValue, shallowRef, toRefs, unrefs} from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TabsRootState } from '../root/TabsRoot';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsRootContext } from '../root/TabsRootContext';
import { TabsListContext } from './TabsListContext';
import { EMPTY_ARRAY } from '@/utils/empty';

/**
 * Groups the individual tab buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsList(componentProps: TabsList.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const activateOnFocus = toValue(componentProps.activateOnFocus) ?? false;
  const loopFocus = toValue(componentProps.loopFocus) ?? true;

  const rootContextRef = useTabsRootContext();

  const highlightedTabIndex = ref(0);
  const setHighlightedTabIndex = (v: number) => (highlightedTabIndex.value = v);
  const tabsListElement = ref<HTMLElement | null>(null);

  const indicatorUpdateListenersRef = shallowRef(new Set<() => void>());
  const tabResizeObserverElementsRef = shallowRef(new Set<HTMLElement>());
  const resizeObserverRef = ref(null as ResizeObserver | null);

  // React 版 useIsoLayoutEffect：ResizeObserver 建立
  let resizeObserverCleanup: (() => void) | undefined;
  const setupObserver = () => {
    resizeObserverCleanup?.();
    resizeObserverCleanup = undefined;

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      indicatorUpdateListenersRef.value.forEach((listener) => {
        listener();
      });
    });

    resizeObserverRef.value = resizeObserver;

    if (tabsListElement.value) {
      resizeObserver.observe(tabsListElement.value);
    }

    tabResizeObserverElementsRef.value.forEach((element) => {
      resizeObserver.observe(element);
    });

    resizeObserverCleanup = () => {
      resizeObserver.disconnect();
      resizeObserverRef.value = null;
    };
  };
  const stopObserver = () => {
    resizeObserverCleanup?.();
    resizeObserverCleanup = undefined;
  };
  const runObserverSetup = () => setupObserver();
  // 挂载后建立（tabsListElement ref 已填充）
  queueMicrotask(runObserverSetup);
  onUnmounted(stopObserver);

  const registerIndicatorUpdateListener = (listener: () => void) => {
    indicatorUpdateListenersRef.value.add(listener);
    return () => {
      indicatorUpdateListenersRef.value.delete(listener);
    };
  };

  const registerTabResizeObserverElement = (element: HTMLElement) => {
    tabResizeObserverElementsRef.value.add(element);
    resizeObserverRef.value?.observe(element);
    return () => {
      tabResizeObserverElementsRef.value.delete(element);
      resizeObserverRef.value?.unobserve(element);
    };
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  const {orientation, setTabMap, tabActivationDirection} = rootContextRef.value;

  const stateValue: TabsListState = {
    orientation,
    tabActivationDirection,
  };

  const defaultProps: Record<string, any> = {
    'aria-orientation': orientation === 'vertical' ? 'vertical' : undefined,
    role: 'tablist',
  };

  const tabsListContextValue: TabsListContext = {
    activateOnFocus,
    registerIndicatorUpdateListener,
    registerTabResizeObserverElement,
    tabsListElement: tabsListElement.value,
  };

  const listElementRef = (el: HTMLElement | null) => {
    tabsListElement.value = el;
  };

  return (
    <TabsListContext.Provider value={tabsListContextValue as any}>
      <CompositeRoot
        render={render as any}
        className={className as any}
        style={style as any}
        state={stateValue as any}
        refs={[listElementRef]}
        props={[defaultProps, unrefs(elementProps)]}
        stateAttributesMapping={tabsStateAttributesMapping}
        highlightedIndex={highlightedTabIndex.value}
        enableHomeAndEndKeys
        loopFocus={loopFocus}
        orientation={orientation}
        onHighlightedIndexChange={setHighlightedTabIndex}
        onMapChange={setTabMap}
        disabledIndices={EMPTY_ARRAY}
      >
        {children?.value}
      </CompositeRoot>
    </TabsListContext.Provider>
  );
}

export interface TabsListState extends TabsRootState {}

export interface TabsListProps extends BaseUIComponentProps<'div', TabsListState> {
  /**
   * Whether to automatically change the active tab on arrow key focus.
   * Otherwise, tabs will be activated using <kbd>Enter</kbd> or <kbd>Space</kbd> key press.
   * @default false
   */
  activateOnFocus?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace TabsList {
  export type State = TabsListState;
  export type Props = TabsListProps;
}

import {computed, onUnmounted, ref, shallowRef, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
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
  // context 载体直取（store-as-is）：字段渲染期属性访问即追踪。
  const rootContext = useTabsRootContext();

  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const activateOnFocus = computed(() => componentProps.activateOnFocus ?? false);
  const loopFocus = computed(() => componentProps.loopFocus ?? true);

  const tabsListElement = ref<HTMLElement | null>(null);

  const indicatorUpdateListenersRef = shallowRef(new Set<() => void>());
  const tabResizeObserverElementsRef = shallowRef(new Set<HTMLElement>());
  const resizeObserverRef = ref(null as ResizeObserver | null);

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

  // React 版 useIsoLayoutEffect：tabsListElement ref 回调填充后建立 observer
  // （元素随 render prop 交换时重建，对齐「observer 跟随宿主元素」语义）。
  watch(tabsListElement, () => setupObserver(), {flush: 'post'});
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

  // 挂载后触发 indicator 重渲染：indicator 的布局计算依赖真实的
  // tabsListElement（provide 时还是首渲染的 null）。
  const listElementRef = (el: HTMLElement | null) => {
    tabsListElement.value = el;
    for (const listener of indicatorUpdateListenersRef.value) {
      listener();
    }
  };

  // store-as-is 载体：身份稳定的 getter 对象（provide 只在 Provider setup 执行
  // 一次，渲染期新对象会冻结快照）——activateOnFocus/tabsListElement 渲染期求值。
  const contextValue: TabsListContext = {
    get activateOnFocus() {
      return activateOnFocus.value;
    },
    registerIndicatorUpdateListener,
    registerTabResizeObserverElement,
    get tabsListElement() {
      return tabsListElement.value;
    },
  };

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<TabsListState>(() => ({
    orientation: rootContext.orientation,
    tabActivationDirection: rootContext.tabActivationDirection,
  }));

  const listProps = computed<Record<string, any>>(() => ({
    'aria-orientation': rootContext.orientation === 'vertical' ? 'vertical' : undefined,
    role: 'tablist',
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 高亮索引由 useCompositeRoot 内部持有（setup 一次性执行，受控回传会停留在
  // 首渲染快照）；TabsTab 经 compositeRootContext 直读实时值并回写。
  return (
    <TabsListContext.Provider value={contextValue}>
      <CompositeRoot
        render={render as any}
        className={className as any}
        style={style as any}
        state={state.value as any}
        refs={[listElementRef]}
        props={[listProps.value, elementProps.value]}
        stateAttributesMapping={tabsStateAttributesMapping}
        enableHomeAndEndKeys
        loopFocus={loopFocus.value}
        orientation={rootContext.orientation}
        onMapChange={rootContext.setTabMap}
        disabledIndices={EMPTY_ARRAY}
      />
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

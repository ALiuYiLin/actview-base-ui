import { computed, onMounted, onUnmounted, ref, shallowRef } from 'actview';
import { createElement } from '@actview/jsx';
import { EMPTY_ARRAY } from '@base-ui/actview-utils/empty';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { TabsRootState } from '@/tabs/root/TabsRoot';
import { CompositeRoot } from '@/internals/composite/root/CompositeRoot';
import { tabsStateAttributesMapping } from '@/tabs/root/stateAttributesMapping';
import { useTabsRootContext } from '@/tabs/root/TabsRootContext';
import { TabsListContext } from '@/tabs/list/TabsListContext';

/**
 * Groups the individual tab buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsList(componentProps: TabsList.Props) {
  const getElementProps = (prev: Record<string, any>) => {
    const {
      activateOnFocus: _activateOnFocus,
      className: _className,
      loopFocus: _loopFocus,
      render: _render,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const root = useTabsRootContext();
  const orientation = computed(() => root.value.orientation);
  const setTabMap = computed(() => root.value.setTabMap);
  const tabActivationDirection = computed(() => root.value.tabActivationDirection);

  const highlightedTabIndex = ref(0);
  const tabsListElement = shallowRef<HTMLElement | null>(null);

  const indicatorUpdateListeners = new Set<() => void>();
  const tabResizeObserverElements = new Set<HTMLElement>();
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      indicatorUpdateListeners.forEach((listener) => {
        listener();
      });
    });

    resizeObserver = observer;

    if (tabsListElement.value) {
      observer.observe(tabsListElement.value);
    }

    tabResizeObserverElements.forEach((element) => {
      observer.observe(element);
    });

    onUnmounted(() => {
      observer.disconnect();
      resizeObserver = null;
    });
  });

  const registerIndicatorUpdateListener = (listener: () => void) => {
    indicatorUpdateListeners.add(listener);
    return () => {
      indicatorUpdateListeners.delete(listener);
    };
  };

  const registerTabResizeObserverElement = (element: HTMLElement) => {
    tabResizeObserverElements.add(element);
    resizeObserver?.observe(element);
    return () => {
      tabResizeObserverElements.delete(element);
      resizeObserver?.unobserve(element);
    };
  };

  const state = computed(
    () =>
      ({
        orientation: orientation.value,
        tabActivationDirection: tabActivationDirection.value,
      }) as TabsListState,
  );

  const defaultProps = (prev: Record<string, any>): HTMLProps => ({
    ...prev,
    'aria-orientation': orientation.value === 'vertical' ? 'vertical' : undefined,
    role: 'tablist',
  });

  const tabsListContextValue = computed(
    () =>
      ({
        activateOnFocus: componentProps.activateOnFocus ?? false,
        registerIndicatorUpdateListener,
        registerTabResizeObserverElement,
        tabsListElement: tabsListElement.value,
      }) as TabsListContext,
  );

  // `createElement` is used instead of `<CompositeRoot ... />` because the JSX element
  // check rejects function-valued `className`/`style` props (plantform-diff.md PD-22).
  // `children` is forwarded explicitly so the tab elements render inside the tablist.
  return (
    <TabsListContext.Provider value={tabsListContextValue}>
      {createElement(CompositeRoot, {
        children: componentProps.children,
        render: componentProps.render,
        className: componentProps.className,
        style: componentProps.style,
        state,
        refs: [
          componentProps.ref,
          (node: HTMLElement | null) => {
            tabsListElement.value = node;
          },
        ],
        props: [defaultProps, getElementProps],
        stateAttributesMapping: tabsStateAttributesMapping,
        highlightedIndex: highlightedTabIndex,
        enableHomeAndEndKeys: true,
        loopFocus: componentProps.loopFocus ?? true,
        orientation: orientation.value,
        onHighlightedIndexChange: (index: number) => {
          highlightedTabIndex.value = index;
        },
        onMapChange: (map: any) => { setTabMap.value(map); },
        disabledIndices: EMPTY_ARRAY,
      })}
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

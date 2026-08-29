import {computed, onUnmounted, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import { inertValue } from '@/utils/inertValue';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import type { BaseUIComponentProps } from '@/internals/types';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsRootState } from '../root/TabsRoot';
import type { TabsTab } from '../tab/TabsTab';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

const stateAttributesMapping: StateAttributesMapping<TabsPanelState> = {
  ...tabsStateAttributesMapping,
  ...transitionStatusMapping,
};

/**
 * A panel displayed when the corresponding tab is active.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsPanel(componentProps: TabsPanel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：字段渲染期属性访问即追踪。
  const rootContext = useTabsRootContext();

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const value = computed(() => componentProps.value);
  const keepMounted = computed(() => componentProps.keepMounted ?? false);

  const id = useBaseUiId();

  const {ref: listItemRef, index} = useCompositeListItem();

  const panelRef = ref<HTMLDivElement | null>(null);

  // open 随 selectedValue/panel value 变化（computed 直读 context getter）。
  const open = computed(() => rootContext.value === value.value);
  const {mounted, transitionStatus, setMounted} = useTransitionStatus(open);

  useOpenChangeComplete({
    open,
    ref: panelRef,
    onComplete() {
      if (!open.value) {
        setMounted(false);
      }
    },
  });

  // React 版 useIsoLayoutEffect：注册 panel id（post watch + onUnmounted 显式
  // 清理——组件卸载时 watch 的 onCleanup 不保证执行）。
  let registerCleanup: (() => void) | undefined;
  watch(
    () => [id, mounted.value, keepMounted.value, value.value] as const,
    () => {
      registerCleanup?.();
      registerCleanup = undefined;

      if (id == null || (!mounted.value && !keepMounted.value)) {
        return;
      }

      registerCleanup = rootContext.registerMountedTabPanel(value.value, id);
    },
    {flush: 'post', immediate: true},
  );
  onUnmounted(() => {
    registerCleanup?.();
    registerCleanup = undefined;
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // 组件自定义 props（value/keepMounted）剔除——否则泄漏到 DOM（对齐 React）。
  const {
    className,
    render,
    style,
    value: _value,
    keepMounted: _keepMounted,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<TabsPanelState>(() => ({
    hidden: !mounted.value,
    orientation: rootContext.orientation,
    tabActivationDirection: rootContext.tabActivationDirection,
    transitionStatus: transitionStatus.value,
  }));

  const rootProps = computed<Record<string, any>>(() => {
    const openValue = open.value;
    return {
      'aria-labelledby': rootContext.getTabIdByPanelValue(value.value),
      hidden: !mounted.value,
      id,
      role: 'tabpanel',
      tabIndex: openValue ? 0 : -1,
      inert: inertValue(!openValue),
      // Computed key: a plain literal key fails the DOM-props excess property check.
      ['data-index' as string]: index.value,
    };
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {keepMounted.value || mounted.value
        ? useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              stateAttributesMapping,
              ref: useMergedRefs(panelRef, listItemRef, componentProps.ref as any),
              props: [rootProps.value, elementProps.value],
            },
          )
        : null}
    </>
  );
}

export interface TabsPanelMetadata {
  id?: string | undefined;
  value: TabsTab.Value;
}

export interface TabsPanelState extends TabsRootState {
  /**
   * If `true`, the panel is hidden from assistive technology.
   */
  hidden: boolean;
  /**
   * The transition status of the panel.
   */
  transitionStatus: TransitionStatus;
}

export interface TabsPanelProps extends BaseUIComponentProps<'div', TabsPanelState> {
  /**
   * The value of the Tab that controls this panel.
   */
  value: TabsTab.Value;
  /**
   * If `true`, the panel remains mounted when inactive.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TabsPanel {
  export type State = TabsPanelState;
  export type Props = TabsPanelProps;
  export type Metadata = TabsPanelMetadata;
}

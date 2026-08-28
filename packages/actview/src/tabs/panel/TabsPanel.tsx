import { ref, toValue, toRefs, unrefs, watch } from 'actview';
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
import { useRenderElement } from '@/internals/useRenderElementLegacy';

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
  const value = toValue(componentProps.value);
  const keepMounted = toValue(componentProps.keepMounted) ?? false;

  const rootContextRef = useTabsRootContext();

  const id = useBaseUiId();

  const {ref: listItemRef, index} = useCompositeListItem();

  const panelRef = ref<HTMLDivElement | null>(null);

  // open 随 selectedValue 变化（render 期读 rootContextRef）
  const open = () => rootContextRef.value.value === value;
  const {mounted, transitionStatus, setMounted} = useTransitionStatus(open);

  useOpenChangeComplete({
    open,
    ref: panelRef,
    onComplete() {
      if (!open()) {
        setMounted(false);
      }
    },
  });

  // React 版 useIsoLayoutEffect：注册 panel id
  let registerCleanup: (() => void) | undefined;
  watch(
    () => [id, mounted.value, keepMounted] as const,
    () => {
      registerCleanup?.();
      registerCleanup = undefined;

      if (id == null || (!mounted.value && !keepMounted)) {
        return;
      }

      registerCleanup = rootContextRef.value.registerMountedTabPanel(value, id);
    },
    {flush: 'post', immediate: true},
  );

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = (): TabsPanelState => {
    const {orientation, tabActivationDirection} = rootContextRef.value;
    return {
      hidden: !mounted.value,
      orientation,
      tabActivationDirection,
      transitionStatus: transitionStatus.value,
    };
  };

  const {element} = useRenderElement({
    props: () => {
      const {value: selectedValue, getTabIdByPanelValue} = rootContextRef.value;

      const openValue = selectedValue === value;
      const correspondingTabId = getTabIdByPanelValue(value);

      return [
        {
          'aria-labelledby': correspondingTabId,
          hidden: !mounted.value,
          id,
          role: 'tabpanel',
          tabIndex: openValue ? 0 : -1,
          inert: inertValue(!openValue),
          // Computed key: a plain literal key fails the DOM-props excess property check.
          ['data-index' as string]: index.value,
        },
        unrefs(elementProps),
      ];
    },
    state: stateFn,
    stateAttributesMapping: stateAttributesMapping as any,
    className,
    style,
    render,
    refs: () => [panelRef as any, listItemRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{keepMounted || mounted.value ? element() : null}</>;
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

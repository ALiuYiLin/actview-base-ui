import { defineComponent, ref, toValue, watch } from 'actview';
import { inertValue } from '@/utils/inertValue';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsRootState } from '../root/TabsRoot';
import type { TabsTab } from '../tab/TabsTab';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

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
export const TabsPanel = defineComponent(function (componentProps: TabsPanel.Props) {
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const {
      value: selectedValue,
      getTabIdByPanelValue,
      orientation,
      tabActivationDirection,
    } = rootContextRef.value;

    const openValue = selectedValue === value;
    const hidden = !mounted.value;

    const correspondingTabId = getTabIdByPanelValue(value);

    const stateValue: TabsPanelState = {
      hidden,
      orientation,
      tabActivationDirection,
      transitionStatus: transitionStatus.value,
    };

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {
        'aria-labelledby': correspondingTabId,
        hidden,
        id,
        role: 'tabpanel',
        tabIndex: openValue ? 0 : -1,
        inert: inertValue(!openValue),
        // Computed key: a plain literal key fails the DOM-props excess property check.
        ['data-index' as string]: index.value,
      },
      elementProps,
      stateAttributes,
    );
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

    const shouldRender = keepMounted || mounted.value;
    if (!shouldRender) {
      return null;
    }

    const mergedRefs = (el: HTMLDivElement | null) => {
      panelRef.value = el;
      listItemRef(el);
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs} />;
    }
    return <div {...merged} ref={mergedRefs}>{componentProps.children}</div>;
  };
}) as unknown as (props: TabsPanel.Props) => JSX.Element;

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

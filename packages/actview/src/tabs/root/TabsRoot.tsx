import {defineComponent, rawRef, ref, toValue, watch, shallowRef} from 'actview';
import type { Ref } from 'actview';
import { useControlled } from '@/utils/useControlled';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import type { CompositeMetadata } from '@/internals/composite/list/CompositeList';
import { TabsRootContext } from './TabsRootContext';
import { tabsStateAttributesMapping } from './stateAttributesMapping';
import type { TabsTab } from '../tab/TabsTab';
import type { TabsPanel } from '../panel/TabsPanel';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

function findTabElement(
  tabMap: Map<Node, CompositeMetadata<TabsTab.Metadata>>,
  value: TabsTab.Value,
): HTMLElement | null {
  for (const [tabElement, tabMetadata] of tabMap.entries()) {
    if (value === tabMetadata.value) {
      return tabElement as HTMLElement;
    }
  }

  return null;
}

function computeActivationDirection(
  oldValue: TabsTab.Value | null,
  newValue: TabsTab.Value | null,
  orientation: 'horizontal' | 'vertical',
  tabMap: Map<Node, CompositeMetadata<TabsTab.Metadata>>,
): TabsTab.ActivationDirection {
  if (oldValue == null || newValue == null) {
    return 'none';
  }

  const [positionProp, backward, forward] =
    orientation === 'horizontal'
      ? (['left', 'left', 'right'] as const)
      : (['top', 'up', 'down'] as const);

  const oldTab = findTabElement(tabMap, oldValue);
  const newTab = findTabElement(tabMap, newValue);

  if (oldTab == null || newTab == null) {
    // Fallback for dynamic tabs: when a tab element isn't registered yet
    // (e.g. added and selected in the same update), infer direction from
    // the values themselves. Works for comparable types (numbers, strings).
    if (
      oldTab !== newTab &&
      (typeof oldValue === 'number' || typeof oldValue === 'string') &&
      typeof oldValue === typeof newValue
    ) {
      return newValue > oldValue ? forward : backward;
    }
    return 'none';
  }

  const oldPosition = oldTab.getBoundingClientRect()[positionProp];
  const newPosition = newTab.getBoundingClientRect()[positionProp];

  if (newPosition < oldPosition) {
    return backward;
  }
  if (newPosition > oldPosition) {
    return forward;
  }

  return 'none';
}

/**
 * Groups the tabs and the corresponding panels.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export const TabsRoot = defineComponent(function (componentProps: TabsRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const defaultValueProp = toValue(componentProps.defaultValue);
  const onValueChangeProp = componentProps.onValueChange;
  const orientation = toValue(componentProps.orientation) ?? 'horizontal';
  const valueProp = toValue(componentProps.value);

  // Track whether the user explicitly provided a defined `defaultValue` prop.
  // Used to determine if we should honor a disabled tab selection.
  const hasExplicitDefaultValueProp = defaultValueProp !== undefined;

  const tabPanelRefs = shallowRef([] as (HTMLElement | null)[]);
  const mountedTabPanels = ref(new Map<TabsTab.Value, string>());

  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: defaultValueProp ?? 0,
    name: 'Tabs',
    state: 'value',
  });

  const isControlled = valueProp !== undefined;

  const tabMap = ref(new Map<Node, CompositeMetadata<TabsTab.Metadata>>());
  const setTabMap = (m: Map<Node, CompositeMetadata<TabsTab.Metadata>>) => {
    tabMap.value = m;
  };
  const lastKnownTabElementRef = ref(undefined as Node | undefined);

  // Used for activation direction detection via tab element positions.
  const getTabElementBySelectedValue = (selectedValue: TabsTab.Value): HTMLElement | null =>
    findTabElement(tabMap.value, selectedValue);

  const activationDirectionState = ref({
    previousValue: value.value as TabsTab.Value | null,
    tabActivationDirection: 'none' as TabsTab.ActivationDirection,
  });
  const committedTabActivationDirection = () => activationDirectionState.value.tabActivationDirection;
  const previousValue = () => activationDirectionState.value.previousValue;

  // Compute activation direction during render when value changes so children see
  // the correct direction on their very first render after the selection update.
  // (actview：render 期重算——响应 value/tabMap 变化；方向状态机近似 React 版)
  let tabActivationDirection = committedTabActivationDirection();
  let directionComputationIncomplete = false;

  if (previousValue() !== value.value) {
    tabActivationDirection = computeActivationDirection(
      previousValue(),
      value.value,
      orientation,
      tabMap.value,
    );

    directionComputationIncomplete =
      previousValue() != null &&
      value.value != null &&
      getTabElementBySelectedValue(value.value) == null;
  }

  const nextPreviousValue = directionComputationIncomplete ? previousValue() : value.value;
  const shouldSyncActivationDirectionState =
    previousValue() !== nextPreviousValue ||
    committedTabActivationDirection() !== tabActivationDirection;

  // React 版 useIsoLayoutEffect：方向状态提交
  watch(
    () => [nextPreviousValue, shouldSyncActivationDirectionState, tabActivationDirection] as const,
    () => {
      if (!shouldSyncActivationDirectionState) {
        return;
      }

      activationDirectionState.value = {
        previousValue: nextPreviousValue,
        tabActivationDirection,
      };
    },
    {flush: 'post', immediate: true},
  );

  const onValueChange = (
    newValue: TabsTab.Value,
    eventDetails: TabsRoot.ChangeEventDetails,
  ) => {
    const activationDirection = computeActivationDirection(
      value.value,
      newValue,
      orientation,
      tabMap.value,
    );

    eventDetails.activationDirection = activationDirection;

    onValueChangeProp?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValue(newValue);
  };

  const notifyAutomaticValueChange = (
    nextValue: TabsTab.Value,
    reason: TabsRoot.ChangeEventReason,
  ) => {
    onValueChangeProp?.(
      nextValue,
      createChangeEventDetails(reason, undefined, undefined, {
        activationDirection: 'none',
      }),
    );
  };

  const registerMountedTabPanel = (panelValue: TabsTab.Value, panelId: string) => {
    const next = new Map(mountedTabPanels.value);
    next.set(panelValue, panelId);
    mountedTabPanels.value = next;

    return () => {
      // Another panel with the same value took ownership in the meantime;
      // leave its registration in place.
      if (mountedTabPanels.value.get(panelValue) !== panelId) {
        return;
      }

      const nextMap = new Map(mountedTabPanels.value);
      nextMap.delete(panelValue);
      mountedTabPanels.value = nextMap;
    };
  };

  // get the `id` attribute of <Tabs.Panel> to set as the value of `aria-controls` on <Tabs.Tab>
  const getTabPanelIdByValue = (tabValue: TabsTab.Value) => mountedTabPanels.value.get(tabValue);

  // get the `id` attribute of <Tabs.Tab> to set as the value of `aria-labelledby` on <Tabs.Panel>
  const getTabIdByPanelValue = (tabPanelValue: TabsTab.Value) => {
    for (const tabMetadata of tabMap.value.values()) {
      if (tabPanelValue === tabMetadata.value) {
        return tabMetadata.id;
      }
    }
    return undefined;
  };

  const selectedTabMetadata = () => {
    for (const tabMetadata of tabMap.value.values()) {
      if (tabMetadata.value === value.value) {
        return tabMetadata;
      }
    }
    return undefined;
  };

  // Find the first non-disabled tab value.
  // Used as a fallback when the current selection is disabled or missing.
  const firstEnabledTabValue = () => {
    for (const tabMetadata of tabMap.value.values()) {
      if (!tabMetadata.disabled) {
        return tabMetadata.value;
      }
    }
    return undefined;
  };

  // Implicit uncontrolled selections are still automatic changes, so notify
  // once when the tabs first register. Explicit defaults are treated as user-owned.
  const shouldNotifyInitialValueChangeRef = ref(!hasExplicitDefaultValueProp);
  // useControlled warns if defaultValue changes after mount, but the
  // disabled-default honor policy below still needs a stable initial value.
  const initialDefaultValueRef = ref(defaultValueProp);
  // An explicit defaultValue can intentionally point at a disabled tab on mount.
  // Once that selection becomes valid, later disabled states should fall back.
  const shouldHonorDisabledDefaultValueRef = ref(hasExplicitDefaultValueProp);
  const didRegisterTabsRef = ref(false);

  // React 版 useIsoLayoutEffect：非受控自动回退
  watch(
    () => [tabMap.value.size, value.value, firstEnabledTabValue(), isControlled] as const,
    () => {
      if (isControlled) {
        return;
      }

      const currentValue = value.value;
      const currentTabMap = tabMap.value;

      function commitAutomaticValueChange(
        fallbackValue: TabsTab.Value,
        fallbackReason: TabsRoot.ChangeEventReason,
      ) {
        setValue(fallbackValue);
        // Automatic fallbacks are not directional transitions; reset the direction
        // alongside the value so the batched commit keeps both in sync.
        activationDirectionState.value = {
          previousValue: fallbackValue,
          tabActivationDirection: 'none',
        };
        notifyAutomaticValueChange(fallbackValue, fallbackReason);
        // Mark the initial notification as delivered only after the consumer
        // callback returns. The fallback value is queued first so automatic
        // consistency updates are not cancelable through a throwing handler.
        shouldNotifyInitialValueChangeRef.value = false;
      }

      if (currentTabMap.size === 0) {
        // A Suspense boundary outside the root can clean up layout effects while
        // keeping the previous tabs connected. Don't treat that as removal.
        if (
          didRegisterTabsRef.value &&
          currentValue !== null &&
          !lastKnownTabElementRef.value?.isConnected
        ) {
          commitAutomaticValueChange(null, REASONS.missing);
        }
        return;
      }

      didRegisterTabsRef.value = true;
      lastKnownTabElementRef.value = currentTabMap.keys().next().value;

      const selectionIsDisabled = selectedTabMetadata()?.disabled;
      const selectionIsMissing = selectedTabMetadata() == null && currentValue !== null;

      if (!selectionIsDisabled && currentValue === initialDefaultValueRef.value) {
        shouldHonorDisabledDefaultValueRef.value = false;
      }

      if (
        shouldHonorDisabledDefaultValueRef.value &&
        selectionIsDisabled &&
        currentValue === initialDefaultValueRef.value
      ) {
        return;
      }

      const shouldNotifyInitialValueChange = shouldNotifyInitialValueChangeRef.value;

      if (selectionIsDisabled || selectionIsMissing) {
        const fallbackValue = firstEnabledTabValue() ?? null;

        if (currentValue === fallbackValue) {
          // Already at the fallback value; no commit or notification needed,
          // but record that the implicit-initial transition has resolved.
          shouldNotifyInitialValueChangeRef.value = false;
          return;
        }

        let fallbackReason: TabsRoot.ChangeEventReason = REASONS.missing;

        if (shouldNotifyInitialValueChange) {
          fallbackReason = REASONS.initial;
        } else if (selectionIsDisabled) {
          fallbackReason = REASONS.disabled;
        }

        commitAutomaticValueChange(fallbackValue, fallbackReason);
        return;
      }

      if (shouldNotifyInitialValueChange && selectedTabMetadata() != null) {
        notifyAutomaticValueChange(currentValue, REASONS.initial);
        shouldNotifyInitialValueChangeRef.value = false;
      }
    },
    {flush: 'post', immediate: true},
  );

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const tabsContextValue: TabsRootContext = {
      getTabElementBySelectedValue,
      getTabIdByPanelValue,
      getTabPanelIdByValue,
      onValueChange,
      orientation,
      registerMountedTabPanel,
      setTabMap,
      tabActivationDirection,
      value: value.value,
    };

    const stateValue: TabsRootState = {
      orientation,
      tabActivationDirection,
    };

    const stateAttributes = getStateAttributesProps(stateValue, tabsStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
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

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} />;
      }
    } else {
      element = <div {...merged}>{componentProps.children}</div>;
    }

    return (
      <TabsRootContext.Provider value={tabsContextValue as any}>
        <CompositeList elementsRef={rawRef(tabPanelRefs)}>{element}</CompositeList>
      </TabsRootContext.Provider>
    );
  };
}) as unknown as (props: TabsRoot.Props) => JSX.Element;

export type TabsRootOrientation = 'horizontal' | 'vertical';

export interface TabsRootState {
  /**
   * The component orientation.
   */
  orientation: TabsRoot.Orientation;
  /**
   * The direction used for tab activation.
   */
  tabActivationDirection: TabsTab.ActivationDirection;
}

export interface TabsRootProps extends BaseUIComponentProps<'div', TabsRootState> {
  /**
   * The value of the currently active `Tab`. Use when the component is controlled.
   * When the value is `null`, no Tab will be active.
   */
  value?: TabsTab.Value | undefined;
  /**
   * The default value. Use when the component is not controlled.
   * When the value is `null`, no Tab will be active.
   * @default 0
   */
  defaultValue?: TabsTab.Value | undefined;
  /**
   * The component orientation (layout flow direction).
   * @default 'horizontal'
   */
  orientation?: TabsRoot.Orientation | undefined;
  /**
   * Callback invoked when new value is being set.
   */
  onValueChange?:
    | ((value: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => void)
    | undefined;
}

export type TabsRootChangeEventReason =
  | typeof REASONS.none
  | typeof REASONS.disabled
  | typeof REASONS.missing
  | typeof REASONS.initial;
export type TabsRootChangeEventDetails = BaseUIChangeEventDetails<
  TabsRoot.ChangeEventReason,
  {activationDirection: TabsTab.ActivationDirection}
>;

export namespace TabsRoot {
  export type State = TabsRootState;
  export type Props = TabsRootProps;
  export type Orientation = TabsRootOrientation;
  export type ChangeEventReason = TabsRootChangeEventReason;
  export type ChangeEventDetails = TabsRootChangeEventDetails;
}

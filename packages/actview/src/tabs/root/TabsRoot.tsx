import { computed, ref, shallowRef, watch } from 'actview';
import type { Ref } from '@actview/core';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import type { BaseUIComponentProps, HTMLProps, Orientation as BaseOrientation } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import type { CompositeMetadata } from '../../internals/composite/list/CompositeList';
import { TabsRootContext } from './TabsRootContext';
import { tabsStateAttributesMapping } from './stateAttributesMapping';
import type { TabsTab } from '../tab/TabsTab';
import type { TabsPanel } from '../panel/TabsPanel';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * Groups the tabs and the corresponding panels.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsRoot(componentProps: TabsRoot.Props) {
  const getElementProps = (prev: Record<string, any>): HTMLProps => {
    const {
      className: _className,
      defaultValue: _defaultValue,
      onValueChange: _onValueChange,
      orientation: _orientation,
      render: _render,
      value: _value,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps } as HTMLProps;
  };

  // Track whether the user explicitly provided a defined `defaultValue` prop.
  // Used to determine if we should honor a disabled tab selection.
  const hasExplicitDefaultValueProp = componentProps.defaultValue !== undefined;

  const tabPanelRefs = { current: [] as (HTMLElement | null)[] };
  const mountedTabPanels = shallowRef(new Map<TabsTab.Value, string>());

  const value = useControlled({
    controlled: () => componentProps.value,
    default: () => componentProps.defaultValue ?? 0,
    name: 'Tabs',
    state: 'value',
  });
  const isControlled = computed(() => componentProps.value !== undefined);

  const tabMap = shallowRef(new Map<Node, CompositeMetadata<TabsTab.Metadata>>());
  const lastKnownTabElement = { current: undefined as Node | undefined };

  // Used for activation direction detection via tab element positions.
  const getTabElementBySelectedValue = (selectedValue: TabsTab.Value): HTMLElement | null =>
    findTabElement(tabMap.value, selectedValue);

  // Activation direction: the previous value snapshot is stored in a ref and synced
  // after the value changes (React version computes this during render and commits via
  // a layout effect; the watch below runs pre-flush, so children see the new direction
  // on the same update).
  const previousValue = ref<TabsTab.Value>(value.value);
  const committedTabActivationDirection = ref<TabsTab.ActivationDirection>('none');

  const directionComputationIncomplete = computed(
    () =>
      previousValue.value != null &&
      value.value != null &&
      getTabElementBySelectedValue(value.value) == null,
  );

  const tabActivationDirection = computed<TabsTab.ActivationDirection>(() => {
    if (previousValue.value === value.value) {
      return committedTabActivationDirection.value;
    }
    return computeActivationDirection(
      previousValue.value,
      value.value,
      componentProps.orientation ?? 'horizontal',
      tabMap.value,
    );
  });

  watch([tabActivationDirection, directionComputationIncomplete], () => {
    const nextPreviousValue = directionComputationIncomplete.value
      ? previousValue.value
      : value.value;
    if (
      previousValue.value !== nextPreviousValue ||
      committedTabActivationDirection.value !== tabActivationDirection.value
    ) {
      previousValue.value = nextPreviousValue;
      committedTabActivationDirection.value = tabActivationDirection.value;
    }
  });

  const onValueChange = (
    newValue: TabsTab.Value,
    eventDetails: TabsRoot.ChangeEventDetails,
  ) => {
    eventDetails.activationDirection = computeActivationDirection(
      value.value,
      newValue,
      componentProps.orientation ?? 'horizontal',
      tabMap.value,
    );

    componentProps.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    value.setValueIfUncontrolled(newValue);
  };

  const notifyAutomaticValueChange = (
    nextValue: TabsTab.Value,
    reason: TabsRoot.ChangeEventReason,
  ) => {
    componentProps.onValueChange?.(
      nextValue,
      createChangeEventDetails(reason, undefined, undefined, {
        activationDirection: 'none',
      }),
    );
  };

  const registerMountedTabPanel = (panelValue: TabsTab.Value, panelId: string) => {
    mountedTabPanels.value = new Map(mountedTabPanels.value).set(panelValue, panelId);

    return () => {
      // Another panel with the same value took ownership in the meantime;
      // leave its registration in place.
      if (mountedTabPanels.value.get(panelValue) !== panelId) {
        return;
      }
      const next = new Map(mountedTabPanels.value);
      next.delete(panelValue);
      mountedTabPanels.value = next;
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

  const tabsContextValue = computed(
    () =>
      ({
        getTabElementBySelectedValue,
        getTabIdByPanelValue,
        getTabPanelIdByValue,
        onValueChange,
        orientation: componentProps.orientation ?? 'horizontal',
        registerMountedTabPanel,
        setTabMap: (map: Map<Node, CompositeMetadata<TabsTab.Metadata>>) => {
          tabMap.value = map;
        },
        tabActivationDirection: tabActivationDirection.value,
        value: value.value,
      }) as TabsRootContext,
  );

  const selectedTabMetadata = computed(() => {
    for (const tabMetadata of tabMap.value.values()) {
      if (tabMetadata.value === value.value) {
        return tabMetadata;
      }
    }
    return undefined;
  });

  // Find the first non-disabled tab value.
  // Used as a fallback when the current selection is disabled or missing.
  const firstEnabledTabValue = computed(() => {
    for (const tabMetadata of tabMap.value.values()) {
      if (!tabMetadata.disabled) {
        return tabMetadata.value;
      }
    }
    return undefined;
  });

  // Implicit uncontrolled selections are still automatic changes, so notify
  // once when the tabs first register. Explicit defaults are treated as user-owned.
  let shouldNotifyInitialValueChange = !hasExplicitDefaultValueProp;
  // useControlled warns if defaultValue changes after mount, but the
  // disabled-default honor policy below still needs a stable initial value.
  const initialDefaultValue = componentProps.defaultValue ?? 0;
  // An explicit defaultValue can intentionally point at a disabled tab on mount.
  // Once that selection becomes valid, later disabled states should fall back.
  let shouldHonorDisabledDefaultValue = hasExplicitDefaultValueProp;
  let didRegisterTabs = false;

  // Uncontrolled roots own automatic fallback. Controlled roots keep the exact
  // value supplied by the parent, even when that tab is disabled or missing.
  watch(
    [isControlled, tabMap, value, selectedTabMetadata, firstEnabledTabValue],
    () => {
      if (isControlled.value) {
        return;
      }

      const commitAutomaticValueChange = (
        fallbackValue: TabsTab.Value,
        fallbackReason: TabsRoot.ChangeEventReason,
      ) => {
        value.setValueIfUncontrolled(fallbackValue);
        // Automatic fallbacks are not directional transitions; reset the direction
        // alongside the value so the batched commit keeps both in sync.
        previousValue.value = fallbackValue;
        committedTabActivationDirection.value = 'none';
        notifyAutomaticValueChange(fallbackValue, fallbackReason);
        // Mark the initial notification as delivered only after the consumer
        // callback returns.
        shouldNotifyInitialValueChange = false;
      };

      if (tabMap.value.size === 0) {
        // A Suspense boundary outside the root can clean up layout effects while
        // keeping the previous tabs connected. Don't treat that as removal.
        if (
          didRegisterTabs &&
          value.value !== null &&
          !lastKnownTabElement.current?.isConnected
        ) {
          commitAutomaticValueChange(null, REASONS.missing);
        }
        return;
      }

      didRegisterTabs = true;
      lastKnownTabElement.current = tabMap.value.keys().next().value;

      const selectionIsDisabled = selectedTabMetadata.value?.disabled;
      const selectionIsMissing = selectedTabMetadata.value == null && value.value !== null;

      if (!selectionIsDisabled && value.value === initialDefaultValue) {
        shouldHonorDisabledDefaultValue = false;
      }

      if (
        shouldHonorDisabledDefaultValue &&
        selectionIsDisabled &&
        value.value === initialDefaultValue
      ) {
        return;
      }

      const shouldNotifyInitial = shouldNotifyInitialValueChange;

      if (selectionIsDisabled || selectionIsMissing) {
        const fallbackValue = firstEnabledTabValue.value ?? null;

        if (value.value === fallbackValue) {
          // Already at the fallback value; no commit or notification needed,
          // but record that the implicit-initial transition has resolved.
          shouldNotifyInitialValueChange = false;
          return;
        }

        let fallbackReason: TabsRoot.ChangeEventReason = REASONS.missing;

        if (shouldNotifyInitial) {
          fallbackReason = REASONS.initial;
        } else if (selectionIsDisabled) {
          fallbackReason = REASONS.disabled;
        }

        commitAutomaticValueChange(fallbackValue, fallbackReason);
        return;
      }

      if (shouldNotifyInitial && selectedTabMetadata.value != null) {
        notifyAutomaticValueChange(value.value, REASONS.initial);
        shouldNotifyInitialValueChange = false;
      }
    },
    { immediate: true },
  );

  const state = computed(
    () =>
      ({
        orientation: componentProps.orientation ?? 'horizontal',
        tabActivationDirection: tabActivationDirection.value,
      }) as TabsRootState,
  );

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getElementProps],
    stateAttributesMapping: tabsStateAttributesMapping,
  });

  return (
    <TabsRootContext.Provider value={tabsContextValue}>
      <CompositeList<TabsPanel.Metadata> elementsRef={tabPanelRefs}>
        {getElement()}
      </CompositeList>
    </TabsRootContext.Provider>
  );
}

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

export type TabsRootOrientation = BaseOrientation;

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
   *
   * The event `reason` is `'none'` for user-initiated changes, such as a click
   * or keyboard navigation; `'initial'` for the first automatic selection or
   * fallback in uncontrolled roots when `defaultValue` is omitted or
   * `undefined`, including when the implicit initial value is disabled or
   * missing; `'disabled'` for automatic fallback when the selected tab becomes
   * disabled in uncontrolled roots; or `'missing'` for automatic fallback when
   * the selected tab is removed, or when an explicit `defaultValue` never
   * matches a mounted tab in uncontrolled roots.
   *
   * For automatic changes, the selected value can be `null` when no enabled Tab
   * is available as a fallback.
   *
   * Automatic changes cannot be canceled; calling `eventDetails.cancel()` for
   * `'initial'`, `'disabled'`, or `'missing'` has no effect.
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
  { activationDirection: TabsTab.ActivationDirection }
>;

export namespace TabsRoot {
  export type State = TabsRootState;
  export type Props = TabsRootProps;
  export type Orientation = TabsRootOrientation;
  export type ChangeEventReason = TabsRootChangeEventReason;
  export type ChangeEventDetails = TabsRootChangeEventDetails;
}

import { computed, watch } from 'actview';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsRootState } from '../root/TabsRoot';
import type { TabsTab } from '../tab/TabsTab';

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
  const getElementProps = (prev: Record<string, any>) => {
    const {
      className: _className,
      value: _value,
      render: _render,
      keepMounted: _keepMounted,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const root = useTabsRootContext();
  const selectedValue = computed(() => root.value.value);
  const getTabIdByPanelValue = computed(() => root.value.getTabIdByPanelValue);
  const orientation = computed(() => root.value.orientation);
  const tabActivationDirection = computed(() => root.value.tabActivationDirection);
  const registerMountedTabPanel = computed(() => root.value.registerMountedTabPanel);

  const id = useBaseUiId();

  const { ref: listItemRef, index } = useCompositeListItem();

  const open = computed(() => componentProps.value === selectedValue.value);
  const { mounted, transitionStatus, setMounted } = useTransitionStatus(open);
  const hidden = computed(() => !mounted.value);

  const correspondingTabId = computed(() => getTabIdByPanelValue.value(componentProps.value));

  const state = computed(
    () =>
      ({
        hidden: hidden.value,
        orientation: orientation.value,
        tabActivationDirection: tabActivationDirection.value,
        transitionStatus: transitionStatus.value,
      }) as TabsPanelState,
  );

  const panelRef = { current: null as HTMLDivElement | null };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, listItemRef, panelRef],
    props: [
      // Getter (not a static object): reactive props must be re-evaluated per render.
      () => ({
        'aria-labelledby': correspondingTabId.value,
        hidden: hidden.value,
        id,
        role: 'tabpanel',
        tabIndex: open.value ? 0 : -1,
        inert: inertValue(!open.value),
        'data-index': index.value,
      }),
      getElementProps,
    ],
    stateAttributesMapping,
  });

  useOpenChangeComplete({
    open,
    ref: panelRef,
    onComplete() {
      if (!open.value) {
        setMounted(false);
      }
    },
  });

  watch(
    [
      id,
      hidden,
      computed(() => componentProps.keepMounted ?? false),
      () => componentProps.value,
      registerMountedTabPanel,
    ],
    (_value, _oldValue, onCleanup) => {
      if (id == null || (hidden.value && !(componentProps.keepMounted ?? false))) {
        return;
      }

      const cleanup = registerMountedTabPanel.value(componentProps.value, id);
      onCleanup(cleanup);
    },
    { immediate: true },
  );

  const shouldRender = computed(() => (componentProps.keepMounted ?? false) || mounted.value);

  // Must end with a JSX return so the Babel transform wraps this component in
  // `defineComponent` (issue #19).
  return <>{shouldRender.value ? getElement() : null}</>;
}

export interface TabsPanelMetadata {
  id?: string | undefined;
  value: TabsTab.Value;
}

export interface TabsPanelState extends TabsRootState {
  /**
   * Whether the component is hidden.
   */
  hidden: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface TabsPanelProps extends BaseUIComponentProps<'div', TabsPanelState> {
  /**
   * The value of the TabPanel. It will be shown when the Tab with the corresponding value is active.
   */
  value: TabsTab.Value;
  /**
   * Whether to keep the HTML element in the DOM while the panel is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TabsPanel {
  export type Metadata = TabsPanelMetadata;
  export type State = TabsPanelState;
  export type Props = TabsPanelProps;
}

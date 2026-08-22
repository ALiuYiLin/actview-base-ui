import { computed, watch } from 'actview';
import type { Ref } from '@actview/core';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button';
import { ACTIVE_COMPOSITE_ITEM } from '@/internals/composite/constants';
import { useCompositeItem } from '@/internals/composite/item/useCompositeItem';
import { useCompositeRootContext } from '@/internals/composite/root/CompositeRootContext';
import type { TabsRoot } from '@/tabs/root/TabsRoot';
import { useTabsRootContext } from '@/tabs/root/TabsRootContext';
import { tabsStateAttributesMapping } from '@/tabs/root/stateAttributesMapping';
import { useTabsListContext } from '@/tabs/list/TabsListContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { activeElement, contains } from '@/floating-ui-actview/utils';

/**
 * An individual interactive tab button that toggles the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsTab(componentProps: TabsTab.Props) {
  const getElementProps = (prev: Record<string, any>) => {
    const {
      className: _className,
      disabled: _disabled,
      render: _render,
      value: _value,
      id: _idProp,
      nativeButton: _nativeButton,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const root = useTabsRootContext();
  const activeTabValue = computed(() => root.value.value);
  const orientation = computed(() => root.value.orientation);
  const tabActivationDirection = computed(() => root.value.tabActivationDirection);
  const onValueChange = computed(() => root.value.onValueChange);
  const getTabPanelIdByValue = computed(() => root.value.getTabPanelIdByValue);

  const list = useTabsListContext();
  const activateOnFocus = computed(() => list.value.activateOnFocus);
  const registerTabResizeObserverElement = computed(() => list.value.registerTabResizeObserverElement);
  const tabsListElement = computed(() => list.value.tabsListElement);

  const compositeRootContext = useCompositeRootContext();
  const highlightedIndex = computed(() => compositeRootContext.value.highlightedIndex);
  const onHighlightedIndexChange = computed(
    () => compositeRootContext.value.onHighlightedIndexChange,
  );

  const disabled = computed(() => componentProps.disabled ?? false);
  const id = useBaseUiId(componentProps.id);
  const tabMetadata = computed<TabsTab.Metadata>(() => ({
    disabled: disabled.value,
    id: id ?? undefined,
    value: componentProps.value,
  }));

  // hook is used instead of the CompositeItem component
  // because the index is needed for Tab internals
  const { compositeProps, compositeRef, index } = useCompositeItem<TabsTab.Metadata>({
    metadata: tabMetadata,
  });

  const active = computed(() => componentProps.value === activeTabValue.value);

  let isNavigating = false;
  let unobserveTabElement: (() => void) | null = null;

  // Registered from the ref callback rather than an effect so the observer
  // follows the rendered element when the `render` prop swaps the host element.
  const observeTabElement = (element: HTMLElement | null) => {
    unobserveTabElement?.();
    unobserveTabElement = element
      ? registerTabResizeObserverElement.value(element)
      : null;
  };

  // Keep the highlighted item in sync with the currently active tab
  // when the value prop changes externally (controlled mode)
  watch([active, index, highlightedIndex, disabled, tabsListElement], () => {
    if (isNavigating) {
      isNavigating = false;
      return;
    }

    if (!(active.value && index.value > -1 && highlightedIndex.value !== index.value)) {
      return;
    }

    // If focus is currently within the tabs list, don't override the roving
    // focus highlight. This keeps keyboard navigation relative to the focused
    // item after an external/asynchronous selection change.
    const listElement = tabsListElement.value;
    if (listElement != null) {
      const activeEl = activeElement(ownerDocument(listElement));
      if (activeEl && contains(listElement, activeEl)) {
        return;
      }
    }

    // Don't highlight disabled tabs to prevent them from interfering with keyboard navigation.
    // Keyboard focus (tabIndex) should remain on an enabled tab even when a disabled tab is selected.
    if (!disabled.value) {
      onHighlightedIndexChange.value(index.value);
    }
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: computed(() => componentProps.nativeButton ?? true),
    focusableWhenDisabled: true,
  });

  const tabPanelId = computed(() => getTabPanelIdByValue.value(componentProps.value));

  let isPressing = false;
  let isMainButton = false;

  // Both callers guard on `!active`, so the current value is never re-committed.
  function activate(event: Event) {
    onValueChange.value(
      componentProps.value,
      createChangeEventDetails(REASONS.none, event, undefined, {
        activationDirection: 'none',
      }),
    );
  }

  function onClick(event: MouseEvent) {
    if (active.value || disabled.value) {
      return;
    }

    activate(event);
  }

  function onFocus(event: FocusEvent) {
    if (active.value || disabled.value) {
      return;
    }

    if (
      activateOnFocus.value &&
      (!isPressing || // keyboard or touch focus
        isMainButton) // main mouse button focus
    ) {
      activate(event);
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (active.value || disabled.value) {
      return;
    }

    isPressing = true;
    // Secondary presses (context menu, middle click) may focus the tab, but
    // must not activate it with `activateOnFocus`.
    isMainButton = event.button === 0;

    // Registered for every button so a secondary press doesn't leave the tab
    // stuck in the pressing state, which would suppress later focus activation.
    const doc = ownerDocument(event.currentTarget as HTMLElement);

    function handlePointerEnd() {
      isPressing = false;
      isMainButton = false;
      doc.removeEventListener('pointerup', handlePointerEnd);
      doc.removeEventListener('pointercancel', handlePointerEnd);
    }

    doc.addEventListener('pointerup', handlePointerEnd);
    doc.addEventListener('pointercancel', handlePointerEnd);
  }

  const state = computed(
    () =>
      ({
        disabled: disabled.value,
        active: active.value,
        orientation: orientation.value,
        tabActivationDirection: tabActivationDirection.value,
      }) as TabsTabState,
  );

  const getElement = useRenderElement('button', componentProps, {
    state,
    ref: [componentProps.ref, buttonRef, compositeRef, observeTabElement],
    props: [
      compositeProps,
      // Getter (not a static object): props must be re-evaluated on every render,
      // otherwise `active.value` etc. are frozen at setup time (see plantform-diff.md).
      () => ({
        role: 'tab',
        'aria-controls': tabPanelId.value,
        // PD-01: ActView renders boolean-true attributes as empty strings; ARIA booleans
        // are normalized to "true"/"false" like React does.
        'aria-selected': active.value ? 'true' : 'false',
        id,
        onClick,
        onFocus,
        onPointerDown,
        ...(active.value ? { [ACTIVE_COMPOSITE_ITEM]: '' } : {}),
        onKeyDownCapture() {
          isNavigating = true;
        },
      }),
      getElementProps,
      getButtonProps,
    ],
    stateAttributesMapping: tabsStateAttributesMapping,
  });

  // Must end with a JSX return so the Babel transform wraps this component in
  // `defineComponent` (issue #19).
  return <>{getElement()}</>;
}

export type TabsTabValue = any | null;

export type TabsTabActivationDirection = 'left' | 'right' | 'up' | 'down' | 'none';

export interface TabsTabPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface TabsTabSize {
  width: number;
  height: number;
}

export interface TabsTabMetadata {
  disabled: boolean;
  id: string | undefined;
  value: TabsTab.Value | undefined;
}

export interface TabsTabState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component is active.
   */
  active: boolean;
  /**
   * The component orientation.
   */
  orientation: TabsRoot.Orientation;
  /**
   * The direction used for tab activation.
   */
  tabActivationDirection: TabsTab.ActivationDirection;
}

export interface TabsTabProps
  extends NativeButtonProps, BaseUIComponentProps<'button', TabsTabState> {
  /**
   * The value of the Tab.
   */
  value: TabsTab.Value;
  /**
   * Whether the Tab is disabled.
   *
   * If a first Tab on a `<Tabs.List>` is disabled, it won't initially be selected.
   * Instead, the next enabled Tab will be selected.
   * However, it does not work like this during server-side rendering, as it is not known
   * during pre-rendering which Tabs are disabled.
   * To work around it, ensure that `defaultValue` or `value` on `<Tabs.Root>` is set to an enabled Tab's value.
   */
  disabled?: boolean | undefined;
}

export namespace TabsTab {
  export type Value = TabsTabValue;
  export type ActivationDirection = TabsTabActivationDirection;
  export type Position = TabsTabPosition;
  export type Size = TabsTabSize;
  export type Metadata = TabsTabMetadata;
  export type State = TabsTabState;
  export type Props = TabsTabProps;
}

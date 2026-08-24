import { defineComponent, onUnmounted, ref, toValue, watch } from 'actview';
import { ownerDocument } from '@/utils/owner';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NativeButtonProps, HTMLProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import { ACTIVE_COMPOSITE_ITEM } from '@/internals/composite/constants';
import { useCompositeItem } from '@/internals/composite/item/useCompositeItem';
import { CompositeRootContext } from '@/internals/composite/root/CompositeRootContext';
import type { TabsRoot } from '../root/TabsRoot';
import { useTabsRootContext } from '../root/TabsRootContext';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsListContext } from '../list/TabsListContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { activeElement, contains } from '@/utils/shadowDom';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

/**
 * An individual interactive tab button that toggles the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export const TabsTab = defineComponent(function (componentProps: TabsTab.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const disabled = toValue(componentProps.disabled) ?? false;
  const value = toValue(componentProps.value);
  const idProp = toValue(componentProps.id);
  const nativeButton = toValue(componentProps.nativeButton) ?? true;

  const rootContextRef = useTabsRootContext();
  const listContextRef = useTabsListContext();

  const compositeRootContext = CompositeRootContext.use();

  const id = useBaseUiId(idProp);

  const tabMetadata = {disabled, id, value};

  const {compositeProps, compositeRef, index} = useCompositeItem<TabsTab.Metadata>({
    metadata: tabMetadata,
  });

  const isNavigatingRef = ref(false);
  const unobserveTabElementRef = ref(null as (() => void) | null);

  // Registered from the ref callback rather than an effect so the observer
  // follows the rendered element when the `render` prop swaps the host element.
  const observeTabElement = (element: HTMLElement | null) => {
    unobserveTabElementRef.value?.();
    unobserveTabElementRef.value = element
      ? listContextRef.value.registerTabResizeObserverElement(element)
      : null;
  };
  onUnmounted(() => {
    unobserveTabElementRef.value?.();
  });

  // Keep the highlighted item in sync with the currently active tab
  // when the value prop changes externally (controlled mode)
  // React 版 useIsoLayoutEffect：active 变化 → onHighlightedIndexChange
  watch(
    () => {
      const {value: activeTabValue} = rootContextRef.value;
      const active = value === activeTabValue;
      const highlightedIndex = compositeRootContext.value?.highlightedIndex;
      return {
        active,
        highlightedIndex,
        tabIndex: index.value,
        onHighlightedIndexChange: compositeRootContext.value?.onHighlightedIndexChange,
        listElement: listContextRef.value.tabsListElement,
      };
    },
    ({active, highlightedIndex, tabIndex, onHighlightedIndexChange, listElement}) => {
      if (isNavigatingRef.value) {
        isNavigatingRef.value = false;
        return;
      }

      if (!(active && tabIndex > -1 && highlightedIndex !== tabIndex)) {
        return;
      }

      // If focus is currently within the tabs list, don't override the roving
      // focus highlight. This keeps keyboard navigation relative to the focused
      // item after an external/asynchronous selection change.
      if (listElement != null) {
        const activeEl = activeElement(ownerDocument(listElement));
        if (activeEl && contains(listElement, activeEl)) {
          return;
        }
      }

      // Don't highlight disabled tabs to prevent them from interfering with keyboard navigation.
      // Keyboard focus (tabIndex) should remain on an enabled tab even when a disabled tab is selected.
      if (!disabled) {
        onHighlightedIndexChange?.(tabIndex);
      }
    },
    {flush: 'post', immediate: true},
  );

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
    focusableWhenDisabled: true,
  });

  const isPressingRef = ref(false);
  const isMainButtonRef = ref(false);

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const {
      value: activeTabValue,
      getTabPanelIdByValue,
      onValueChange,
      orientation,
      tabActivationDirection,
    } = rootContextRef.value;

    const active = value === activeTabValue;
    const tabPanelId = getTabPanelIdByValue(value);

    // Both callers guard on `!active`, so the current value is never re-committed.
    function activate(event: any) {
      onValueChange(
        value,
        createChangeEventDetails(REASONS.none, event, undefined, {
          activationDirection: 'none',
        }),
      );
    }

    function onClick(event: any) {
      if (active || disabled) {
        return;
      }

      activate(event);
    }

    function onFocus(event: any) {
      if (active || disabled) {
        return;
      }

      if (
        listContextRef.value.activateOnFocus &&
        (!isPressingRef.value || // keyboard or touch focus
          isMainButtonRef.value) // main mouse button focus
      ) {
        activate(event);
      }
    }

    function onPointerDown(event: any) {
      if (active || disabled) {
        return;
      }

      isPressingRef.value = true;
      // Secondary presses (context menu, middle click) may focus the tab, but
      // must not activate it with `activateOnFocus`.
      isMainButtonRef.value = event.button === 0;

      // Registered for every button so a secondary press doesn't leave the tab
      // stuck in the pressing state, which would suppress later focus activation.
      const doc = ownerDocument(event.currentTarget);

      function handlePointerEnd() {
        isPressingRef.value = false;
        isMainButtonRef.value = false;
        doc.removeEventListener('pointerup', handlePointerEnd);
        doc.removeEventListener('pointercancel', handlePointerEnd);
      }

      doc.addEventListener('pointerup', handlePointerEnd);
      doc.addEventListener('pointercancel', handlePointerEnd);
    }

    const stateValue: TabsTabState = {
      disabled,
      active,
      orientation,
      tabActivationDirection,
    };

    const stateAttributes = getStateAttributesProps(stateValue, tabsStateAttributesMapping);

    const merged: HTMLProps = {};
    for (const prop of [
      compositeProps,
      {
        role: 'tab',
        'aria-controls': tabPanelId,
        'aria-selected': active,
        id,
        onClick,
        onFocus,
        onPointerDown,
        [ACTIVE_COMPOSITE_ITEM as string]: active ? '' : undefined,
        onKeyDownCapture() {
          isNavigatingRef.value = true;
        },
      },
      elementProps,
      getButtonProps,
    ]) {
      const resolved = typeof prop === 'function' ? prop(merged) : prop;
      Object.assign(merged, resolved);
    }
    Object.assign(merged, stateAttributes);

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

    const mergedRefs = (el: HTMLElement | null) => {
      buttonRef(el);
      compositeRef(el);
      observeTabElement(el);
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
    return <button {...merged} ref={mergedRefs}>{componentProps.children}</button>;
  };
}) as unknown as (props: TabsTab.Props) => JSX.Element;

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

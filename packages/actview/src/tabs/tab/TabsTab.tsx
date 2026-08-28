import { computed, onUnmounted, ref, toRefs, watch } from 'actview';
import type { Ref } from 'actview';
import { ownerDocument } from '@/utils/owner';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
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
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * An individual interactive tab button that toggles the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsTab(componentProps: TabsTab.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：字段渲染期属性访问即追踪。
  const rootContext = useTabsRootContext();
  const listContext = useTabsListContext();
  const compositeRootContext = CompositeRootContext.use();

  // 初始化型快照（仅 setup 一次性消费）。
  const idProp = componentProps.id;

  // 渲染期/事件期消费的 props：computed 直读。
  const disabled = computed(() => componentProps.disabled ?? false);
  const value = computed(() => componentProps.value);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  const id = useBaseUiId(idProp);

  const tabMetadata = computed(() => ({
    disabled: disabled.value,
    id: id,
    value: value.value,
  }));

  const {compositeProps, compositeRef, index} = useCompositeItem<TabsTab.Metadata>({
    metadata: tabMetadata.value,
  });

  const isNavigatingRef = ref(false);
  const unobserveTabElementRef = ref(null as (() => void) | null);

  // Registered from the ref callback rather than an effect so the observer
  // follows the rendered element when the `render` prop swaps the host element.
  const observeTabElement = (element: HTMLElement | null) => {
    unobserveTabElementRef.value?.();
    unobserveTabElementRef.value = element
      ? listContext.registerTabResizeObserverElement(element)
      : null;
  };
  onUnmounted(() => {
    unobserveTabElementRef.value?.();
  });

  // Keep the highlighted item in sync with the currently active tab
  // when the value prop changes externally (controlled mode)
  watch(
    () => {
      const activeTabValue = rootContext.value;
      const active = value.value === activeTabValue;
      const highlightedIndex = compositeRootContext?.highlightedIndex;
      return {
        active,
        highlightedIndex,
        tabIndex: index.value,
        onHighlightedIndexChange: compositeRootContext?.onHighlightedIndexChange,
        listElement: listContext.tabsListElement,
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

      if (listElement != null) {
        const activeEl = activeElement(ownerDocument(listElement));
        if (activeEl && contains(listElement, activeEl)) {
          return;
        }
      }

      if (!disabled.value) {
        onHighlightedIndexChange?.(tabIndex);
      }
    },
    {flush: 'post', immediate: true},
  );

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton.value,
    focusableWhenDisabled: true,
  });

  const isPressingRef = ref(false);
  const isMainButtonRef = ref(false);

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

  const state = computed<TabsTabState>(() => ({
    disabled: disabled.value,
    active: value.value === rootContext.value,
    orientation: rootContext.orientation,
    tabActivationDirection: rootContext.tabActivationDirection,
  }));

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  const handleTabClick = (event: any) => {
    if (state.value.active || disabled.value) {
      return;
    }

    rootContext.onValueChange(
      value.value,
      createChangeEventDetails(REASONS.none, event, undefined, {
        activationDirection: 'none',
      }),
    );
  };

  const handleTabFocus = (event: any) => {
    if (state.value.active || disabled.value) {
      return;
    }

    if (
      listContext.activateOnFocus &&
      (!isPressingRef.value || isMainButtonRef.value)
    ) {
      rootContext.onValueChange(
        value.value,
        createChangeEventDetails(REASONS.none, event, undefined, {
          activationDirection: 'none',
        }),
      );
    }
  };

  const handleTabPointerDown = (event: any) => {
    if (state.value.active || disabled.value) {
      return;
    }

    isPressingRef.value = true;
    isMainButtonRef.value = event.button === 0;

    const doc = ownerDocument(event.currentTarget);

    function handlePointerEnd() {
      isPressingRef.value = false;
      isMainButtonRef.value = false;
      doc.removeEventListener('pointerup', handlePointerEnd);
      doc.removeEventListener('pointercancel', handlePointerEnd);
    }

    doc.addEventListener('pointerup', handlePointerEnd);
    doc.addEventListener('pointercancel', handlePointerEnd);
  };

  // 根元素 props：composite → role/aria/handlers → 透传 → getButtonProps。
  const rootProps = computed(() =>
    mergeFn([
      compositeProps,
      {
        role: 'tab',
        'aria-controls': rootContext.getTabPanelIdByValue(value.value),
        'aria-selected': state.value.active,
        id: id,
        onClick: handleTabClick,
        onFocus: handleTabFocus,
        onPointerDown: handleTabPointerDown,
        [ACTIVE_COMPOSITE_ITEM as string]: state.value.active ? '' : undefined,
        onKeyDownCapture() {
          isNavigatingRef.value = true;
        },
      },
      elementProps.value,
      getButtonProps,
    ]),
  );

  // mergePropsN 局部调用（5 项——数组内 getter 消费 prev 语义一致）。
  function mergeFn(inputs: any[]): Record<string, any> {
    const merged: Record<string, any> = {};
    for (const prop of inputs) {
      const resolved = typeof prop === 'function' ? prop(merged) : prop;
      Object.assign(merged, resolved);
    }
    return merged;
  }

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'button',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: tabsStateAttributesMapping,
          ref: useMergedRefs(buttonRef, compositeRef, observeTabElement, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
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

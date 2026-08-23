import { defineComponent, onUnmounted, ref, toValue } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsListContext } from '../list/TabsListContext';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsTab } from '../tab/TabsTab';
import { TabsRoot } from '../root/TabsRoot';
import type { TabsRootState } from '../root/TabsRoot';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

const stateAttributesMapping = {
  ...tabsStateAttributesMapping,
  activeTabPosition: () => null,
  activeTabSize: () => null,
};

// `offsetLeft`/`offsetTop` are rounded to whole pixels and the error can compound
// across the offset parent chain.
const MAX_LAYOUT_ROUNDING_ERROR = 2;

/**
 * A visual indicator that can be styled to match the position of the currently active tab.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export const TabsIndicator = defineComponent(function (componentProps: TabsIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const renderBeforeHydration = toValue(componentProps.renderBeforeHydration) ?? false;

  const rootContextRef = useTabsRootContext();
  const listContextRef = useTabsListContext();

  // 强制重渲染计数器（ResizeObserver 更新指示器位置）
  const rerenderCount = ref(0);

  // React 版 useEffect：注册指示器更新监听
  const unregisterListener = listContextRef.value.registerIndicatorUpdateListener(() => {
    rerenderCount.value += 1;
  });
  onUnmounted(unregisterListener);

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    void rerenderCount.value;
    const {className, render, style: styleProp, ...elementProps} = componentProps;

    const {getTabElementBySelectedValue, orientation, tabActivationDirection, value} =
      rootContextRef.value;
    const {tabsListElement} = listContextRef.value;

    let left = 0;
    let right = 0;
    let top = 0;
    let bottom = 0;
    let width = 0;
    let height = 0;

    let isTabSelected = false;

    if (value != null && tabsListElement != null) {
      const activeTab = getTabElementBySelectedValue(value);

      if (activeTab != null) {
        isTabSelected = true;

        const {width: computedWidth, height: computedHeight} = getCssDimensions(activeTab);
        const {width: tabListWidth, height: tabListHeight} = getCssDimensions(tabsListElement);
        const tabRect = activeTab.getBoundingClientRect();
        const tabsListRect = tabsListElement.getBoundingClientRect();
        const scaleX = tabListWidth > 0 ? tabsListRect.width / tabListWidth : 1;
        const scaleY = tabListHeight > 0 ? tabsListRect.height / tabListHeight : 1;

        // Layout offsets are immune to transforms, but lose sub-pixel precision.
        const layoutOffset = getLayoutOffset(activeTab, tabsListElement);
        left = layoutOffset.left;
        top = layoutOffset.top;

        const rectLeft =
          (tabRect.left - tabsListRect.left) / scaleX +
          tabsListElement.scrollLeft -
          tabsListElement.clientLeft;
        const rectTop =
          (tabRect.top - tabsListRect.top) / scaleY +
          tabsListElement.scrollTop -
          tabsListElement.clientTop;

        // The rect-based offset is sub-pixel-precise but is derived from projected viewport
        // geometry; when it agrees with the layout offset (up to layout rounding), the more
        // precise value is safe to use.
        const tabTranslation = getActiveTabTranslation(activeTab);
        if (
          Math.abs(rectLeft - tabTranslation.x - left) <= MAX_LAYOUT_ROUNDING_ERROR &&
          Math.abs(rectTop - tabTranslation.y - top) <= MAX_LAYOUT_ROUNDING_ERROR
        ) {
          left = rectLeft;
          top = rectTop;
        }

        width = computedWidth;
        height = computedHeight;
        right = tabsListElement.scrollWidth - left - width;
        bottom = tabsListElement.scrollHeight - top - height;
      }
    }

    const activeTabPosition = isTabSelected ? {left, right, top, bottom} : null;
    const activeTabSize = isTabSelected ? {width, height} : null;

    const style: Record<string, any> | undefined = isTabSelected
      ? {
          '--active-tab-left': `${left}px`,
          '--active-tab-right': `${right}px`,
          '--active-tab-top': `${top}px`,
          '--active-tab-bottom': `${bottom}px`,
          '--active-tab-width': `${width}px`,
          '--active-tab-height': `${height}px`,
        }
      : undefined;

    const displayIndicator = isTabSelected && width > 0 && height > 0;

    const stateValue: TabsIndicatorState = {
      orientation,
      activeTabPosition,
      activeTabSize,
      tabActivationDirection,
    };

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {
        role: 'presentation',
        style,
        hidden: !displayIndicator, // do not display the indicator before the layout is settled
      },
      elementProps,
      stateAttributes,
    );
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof styleProp === 'function') {
      merged.style = Object.assign({}, style, styleProp(stateValue));
    } else if (styleProp !== undefined) {
      merged.style = Object.assign({}, style, styleProp);
    }

    if (value == null) {
      return null;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue} as any);
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
      return <Tag key={render.key} {...mergedRenderProps} />;
    }
    return <span {...merged} />;
  };
}) as unknown as (props: TabsIndicator.Props) => JSX.Element;

export interface TabsIndicatorState extends TabsRootState {
  /**
   * The active tab position.
   */
  activeTabPosition: TabsTab.Position | null;
  /**
   * The active tab size.
   */
  activeTabSize: TabsTab.Size | null;
  /**
   * The component orientation.
   */
  orientation: TabsRoot.Orientation;
}

export interface TabsIndicatorProps extends BaseUIComponentProps<'span', TabsIndicatorState> {
  /**
   * Whether to render itself before React hydrates.
   * This minimizes the time that the indicator isn't visible after server-side rendering.
   * @default false
   */
  renderBeforeHydration?: boolean | undefined;
}

export namespace TabsIndicator {
  export type State = TabsIndicatorState;
  export type Props = TabsIndicatorProps;
}

function getLayoutOffset(element: HTMLElement, ancestor: HTMLElement) {
  const elementOffset = getCumulativeOffset(element);
  const ancestorOffset = getCumulativeOffset(ancestor);

  let left = elementOffset.left - ancestorOffset.left - ancestor.clientLeft;
  let top = elementOffset.top - ancestorOffset.top - ancestor.clientTop;

  let node: Node | null = element.parentNode;
  while (isHTMLElement(node) && node !== ancestor && !isLastTraversableNode(node)) {
    left -= node.scrollLeft;
    top -= node.scrollTop;
    node = node.parentNode;
  }

  return {left, top};
}

function getCumulativeOffset(element: HTMLElement) {
  let left = 0;
  let top = 0;
  let currentElement: HTMLElement | null = element;

  while (currentElement != null) {
    left += currentElement.offsetLeft;
    top += currentElement.offsetTop;

    const offsetParent = currentElement.offsetParent as HTMLElement | null;
    if (offsetParent != null) {
      left += offsetParent.clientLeft;
      top += offsetParent.clientTop;
    }

    currentElement = offsetParent;
  }

  return {left, top};
}

// Returns the active tab's own 2D translation, in CSS pixels: the translation component of
// the computed `transform` matrix plus the `translate` longhand.
function getActiveTabTranslation(element: HTMLElement) {
  const computedStyle = element.ownerDocument.defaultView?.getComputedStyle(element);
  const transform = computedStyle?.transform;
  let translateX = 0;
  let translateY = 0;

  if (transform && transform !== 'none') {
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (match) {
      const values = match[1].split(',').map(Number);
      if (values.length >= 6) {
        translateX = values[4] || 0;
        translateY = values[5] || 0;
      }
    }
  }

  // The `translate` longhand is a separate property and is not reflected in the
  // computed `transform` matrix. `getComputedStyle` resolves absolute and font-relative
  // lengths to pixels but keeps percentages, which resolve against the tab's border box.
  const translate = computedStyle?.translate;
  if (translate && translate !== 'none') {
    const parts = translate.split(' ');
    translateX += resolveTranslateLength(parts[0], element.offsetWidth);
    translateY += resolveTranslateLength(parts[1], element.offsetHeight);
  }

  return {x: translateX, y: translateY};
}

function resolveTranslateLength(value: string | undefined, referenceSize: number): number {
  if (!value) {
    return 0;
  }
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return value.endsWith('%') ? (numeric / 100) * referenceSize : numeric;
}

function getCssDimensions(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    width: element.offsetWidth || rect.width,
    height: element.offsetHeight || rect.height,
  };
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

function isLastTraversableNode(node: Node) {
  return node.nodeType === 9 /* DOCUMENT_NODE */ || (node.nodeType === 1 && node === node.ownerDocument?.body);
}

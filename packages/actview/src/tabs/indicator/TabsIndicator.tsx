import { computed, onMounted, onUnmounted, ref } from 'actview';
import { getParentNode, isHTMLElement, isLastTraversableNode } from '@floating-ui/utils/dom';
import { ownerWindow } from '@base-ui/actview-utils/owner';
import { script as prehydrationScript } from '@/tabs/indicator/prehydrationScript.min';
import { PrehydrationScript } from '@/internals/PrehydrationScript';
import { useRenderElement } from '@/internals/useRenderElement';
import { getCssDimensions } from '@/utils/getCssDimensions';
import { getElementTransform } from '@/utils/getElementTransform';
import type { BaseUIComponentProps } from '@/internals/types';
import type { TabsRoot, TabsRootState } from '@/tabs/root/TabsRoot';
import { useTabsRootContext } from '@/tabs/root/TabsRootContext';
import { tabsStateAttributesMapping } from '@/tabs/root/stateAttributesMapping';
import { useTabsListContext } from '@/tabs/list/TabsListContext';
import type { TabsTab } from '@/tabs/tab/TabsTab';

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
export function TabsIndicator(componentProps: TabsIndicator.Props) {
  const getElementProps = (prev: Record<string, any>) => {
    const {
      className: _className,
      render: _render,
      renderBeforeHydration: _renderBeforeHydration,
      style: _styleProp,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const root = useTabsRootContext();
  const value = computed(() => root.value.value);
  const getTabElementBySelectedValue = computed(() => root.value.getTabElementBySelectedValue);
  const orientation = computed(() => root.value.orientation);
  const tabActivationDirection = computed(() => root.value.tabActivationDirection);

  const list = useTabsListContext();
  const tabsListElement = computed(() => list.value.tabsListElement);
  const registerIndicatorUpdateListener = computed(() => list.value.registerIndicatorUpdateListener);

  // `useForcedRerendering` has no ActView equivalent (plantform-diff.md PD-13): a local
  // tick ref re-evaluates the measurement computed when the indicator update listeners fire.
  const tick = ref(0);
  const rerender = () => {
    tick.value += 1;
  };

  onMounted(() => {
    const unregister = registerIndicatorUpdateListener.value(rerender);
    onUnmounted(unregister);
  });

  const measurement = computed(() => {
    // Reading `tick` establishes the re-render dependency for external updates.
    void tick.value;

    let left = 0;
    let right = 0;
    let top = 0;
    let bottom = 0;
    let width = 0;
    let height = 0;
    let isTabSelected = false;

    if (value.value != null && tabsListElement.value != null) {
      const activeTab = getTabElementBySelectedValue.value(value.value);

      if (activeTab != null) {
        isTabSelected = true;

        const { width: computedWidth, height: computedHeight } = getCssDimensions(activeTab);
        const { width: tabListWidth, height: tabListHeight } = getCssDimensions(
          tabsListElement.value,
        );
        const tabRect = activeTab.getBoundingClientRect();
        const tabsListRect = tabsListElement.value.getBoundingClientRect();
        const scaleX = tabListWidth > 0 ? tabsListRect.width / tabListWidth : 1;
        const scaleY = tabListHeight > 0 ? tabsListRect.height / tabListHeight : 1;

        // Layout offsets are immune to transforms, but lose sub-pixel precision.
        const layoutOffset = getLayoutOffset(activeTab, tabsListElement.value);
        left = layoutOffset.left;
        top = layoutOffset.top;

        const rectLeft =
          (tabRect.left - tabsListRect.left) / scaleX +
          tabsListElement.value.scrollLeft -
          tabsListElement.value.clientLeft;
        const rectTop =
          (tabRect.top - tabsListRect.top) / scaleY +
          tabsListElement.value.scrollTop -
          tabsListElement.value.clientTop;

        // The rect-based offset is sub-pixel-precise but is derived from projected viewport
        // geometry: a rotation, skew, flip, perspective, or 3D transform on the tab or any
        // ancestor warps it beyond what the scale division can undo. When it agrees with the
        // layout offset (up to layout rounding), no distortion is in effect and the more
        // precise value is safe to use.
        //
        // The active tab's own translation moves the rect but not the layout offset, so
        // strip it from the comparison.
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
        right = tabsListElement.value.scrollWidth - left - width;
        bottom = tabsListElement.value.scrollHeight - top - height;
      }
    }

    return { left, right, top, bottom, width, height, isTabSelected };
  });

  const activeTabPosition = computed(() =>
    measurement.value.isTabSelected
      ? {
          left: measurement.value.left,
          right: measurement.value.right,
          top: measurement.value.top,
          bottom: measurement.value.bottom,
        }
      : null,
  );

  const activeTabSize = computed(() =>
    measurement.value.isTabSelected
      ? { width: measurement.value.width, height: measurement.value.height }
      : null,
  );

  const style = computed<Record<string, string> | undefined>(() =>
    measurement.value.isTabSelected
      ? {
          '--active-tab-left': `${measurement.value.left}px`,
          '--active-tab-right': `${measurement.value.right}px`,
          '--active-tab-top': `${measurement.value.top}px`,
          '--active-tab-bottom': `${measurement.value.bottom}px`,
          '--active-tab-width': `${measurement.value.width}px`,
          '--active-tab-height': `${measurement.value.height}px`,
        }
      : undefined,
  );

  const displayIndicator = computed(
    () =>
      measurement.value.isTabSelected &&
      measurement.value.width > 0 &&
      measurement.value.height > 0,
  );

  const state = computed(
    () =>
      ({
        orientation: orientation.value,
        activeTabPosition: activeTabPosition.value,
        activeTabSize: activeTabSize.value,
        tabActivationDirection: tabActivationDirection.value,
      }) as TabsIndicatorState,
  );

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      // Getter (not a static object): reactive props must be re-evaluated per render.
      () => ({
        role: 'presentation',
        style: style.value,
        hidden: !displayIndicator.value, // do not display the indicator before the layout is settled
      }),
      getElementProps,
    ],
    stateAttributesMapping,
  });

  // Must end with a JSX return so the Babel transform wraps this component in
  // `defineComponent` (issue #19).
  return (
    <>
      {value.value == null ? null : getElement()}
      {value.value != null && (componentProps.renderBeforeHydration ?? false) && (
        <PrehydrationScript script={prehydrationScript} />
      )}
    </>
  );
}

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

  // `offsetLeft`/`offsetTop` describe layout, and scrolling doesn't change layout: a scroll
  // container between the tab and the list moves the tab on screen while its layout slot stays
  // put. Subtract that scroll so this offset remains comparable with the rect-based one below.
  //
  // `getParentNode` crosses shadow boundaries (and slots).
  let node: Node | null = getParentNode(element);
  while (isHTMLElement(node) && node !== ancestor && !isLastTraversableNode(node)) {
    left -= node.scrollLeft;
    top -= node.scrollTop;
    node = getParentNode(node);
  }

  return { left, top };
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

  return { left, top };
}

// Returns the active tab's own 2D translation, in CSS pixels: the translation component of
// the computed `transform` matrix plus the `translate` longhand.
function getActiveTabTranslation(element: HTMLElement) {
  const computedStyle = ownerWindow(element).getComputedStyle(element);
  const { x, y } = getElementTransform(element, computedStyle);
  let translateX = x;
  let translateY = y;

  // The `translate` longhand is a separate property and is not reflected in the
  // computed `transform` matrix that `getElementTransform` reads.
  const { translate } = computedStyle;
  if (translate && translate !== 'none') {
    const parts = translate.split(' ');
    translateX += resolveTranslateLength(parts[0], element.offsetWidth);
    translateY += resolveTranslateLength(parts[1], element.offsetHeight);
  }

  return { x: translateX, y: translateY };
}

// Resolves a single `translate` longhand component to pixels. Percentages resolve against
// the given border-box size; anything that isn't a plain number or percentage (e.g.
// `calc(...)`) is treated as no translation, so the indicator falls back to the tab's
// layout slot rather than guessing.
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

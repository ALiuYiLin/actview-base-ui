import { computed, watch } from 'actview';
import type { VNode } from '@actview/jsx';
import { rectToClientRect } from '@floating-ui/utils';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { platform } from '@base-ui/actview-utils/platform';
import { ownerDocument, ownerWindow } from '@base-ui/actview-utils/owner';
import { useAnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import { clamp } from '@base-ui/actview-utils/clamp';
import { FloatingFocusManager, platform as floatingPlatform } from '../../floating-ui-actview';
import type { ClientRectObject } from '../../floating-ui-actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useSelectPositionerContext } from '../positioner/SelectPositionerContext';
import { styleDisableScrollbar } from '../../utils/styles';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import { selectors } from '../store';
import { clearStyles, LIST_FUNCTIONAL_STYLES } from './utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext';
import { COMPOSITE_KEYS } from '../../internals/composite/composite';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';
import { getMaxScrollOffset, SCROLL_EDGE_TOLERANCE_PX } from '../../utils/scrollEdges';
import { useCSPContext } from '../../internals/csp-context/CspContext';
import { useDirection } from '../../internals/direction-context/DirectionContext';

const stateAttributesMapping: StateAttributesMapping<SelectPopupState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the select list.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPopup(componentProps: SelectPopup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    finalFocus,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const {
    store,
    popupRef,
    onOpenChangeComplete,
    setOpen,
    valueRef,
    firstItemTextRef,
    selectedItemTextRef,
    multiple,
    handleScrollArrowVisibility,
    scrollHandlerRef,
    listRef,
    highlightItemOnHover,
    floatingContext: floatingRootContext,
  } = rootContext;
  const positionerContext = useSelectPositionerContext();
  const insideToolbar = useToolbarRootContext(true).value != null;
  const direction = useDirection();

  const cspContext = useCSPContext();
  const nonce = computed(() => cspContext.value.nonce);
  const disableStyleElements = computed(() => cspContext.value.disableStyleElements);

  const id = store.useState('id');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const mounted = store.useState('mounted');
  const popupProps = store.useState('popupProps');
  const transitionStatus = store.useState('transitionStatus');
  const triggerElement = store.useState('triggerElement');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');

  const reachedMaxHeightRef = { current: false };
  const initialPlacedRef = { current: false };
  const originalPositionerStylesRef = { current: {} as Record<string, string> };

  const scrollArrowFrame = useAnimationFrame();

  const handleScroll = (scroller: HTMLDivElement) => {
    if (!positionerElement.value || !popupRef.current || !initialPlacedRef.current) {
      return;
    }

    const isTopPositioned = positionerElement.value.style.top === '0px';
    const isBottomPositioned = positionerElement.value.style.bottom === '0px';

    if (
      reachedMaxHeightRef.current ||
      !positionerContext.value.alignItemWithTriggerActive ||
      (!isTopPositioned && !isBottomPositioned)
    ) {
      handleScrollArrowVisibility(scroller);
      return;
    }

    const scale = getScale(positionerElement.value);
    const currentHeight = normalizeSize(
      positionerElement.value.getBoundingClientRect().height,
      'y',
      scale,
    );
    const doc = ownerDocument(positionerElement.value);
    const win = ownerWindow(positionerElement.value);
    const positionerStyles = win.getComputedStyle(positionerElement.value);
    const marginTop = parseFloat(positionerStyles.marginTop);
    const marginBottom = parseFloat(positionerStyles.marginBottom);
    const maxPopupHeight = getMaxPopupHeight(win.getComputedStyle(popupRef.current));
    const maxAvailableHeight = Math.min(
      doc.documentElement.clientHeight - marginTop - marginBottom,
      maxPopupHeight,
    );

    const scrollTop = scroller.scrollTop;
    const maxScrollTop = getMaxScrollTop(scroller);

    // `Infinity` requests a scroll to the recomputed maximum offset.
    let nextScrollTop: number | null = null;

    const setHeight = (height: number) => {
      positionerElement.value!.style.height = `${height}px`;
    };

    const diff = isTopPositioned ? maxScrollTop - scrollTop : scrollTop;
    const nextHeight = Math.min(currentHeight + diff, maxAvailableHeight);

    if (diff <= SCROLL_EDGE_TOLERANCE_PX) {
      const heightDelta = clamp(diff, 0, maxAvailableHeight - currentHeight);
      if (heightDelta > 0) {
        // Consume the remaining scroll in height.
        setHeight(currentHeight + heightDelta);
      }
      scroller.scrollTop = isTopPositioned ? maxScrollTop : 0;
      if (maxAvailableHeight - (currentHeight + heightDelta) <= SCROLL_EDGE_TOLERANCE_PX) {
        reachedMaxHeightRef.current = true;
      }
      handleScrollArrowVisibility(scroller);
      return;
    }

    if (maxAvailableHeight - nextHeight > SCROLL_EDGE_TOLERANCE_PX) {
      nextScrollTop = isTopPositioned ? Infinity : 0;
    } else if (isBottomPositioned && scrollTop < maxScrollTop) {
      const overshoot = currentHeight + diff - maxAvailableHeight;
      nextScrollTop = scrollTop - (diff - overshoot);
    }

    const nextPositionerHeight = Math.ceil(nextHeight);

    if (nextPositionerHeight !== 0) {
      setHeight(nextPositionerHeight);
    }

    if (nextScrollTop != null) {
      // Recompute bounds after resizing (clientHeight likely changed).
      const target = clamp(nextScrollTop, 0, getMaxScrollTop(scroller));

      // Avoid adjustments that re-trigger scroll events forever.
      if (Math.abs(scroller.scrollTop - target) > SCROLL_EDGE_TOLERANCE_PX) {
        scroller.scrollTop = target;
      }
    }

    if (nextPositionerHeight >= maxAvailableHeight - SCROLL_EDGE_TOLERANCE_PX) {
      reachedMaxHeightRef.current = true;
    }

    handleScrollArrowVisibility(scroller);
  };

  scrollHandlerRef.current = handleScroll;

  useOpenChangeComplete({
    open,
    ref: popupRef,
    onComplete() {
      if (open.value) {
        onOpenChangeComplete?.(true);
      }
    },
  });

  const state = computed<SelectPopupState>(() => ({
    open: open.value,
    transitionStatus: transitionStatus.value,
    side: positionerContext.value.side.value,
    align: positionerContext.value.align.value,
  }));

  // Save the original positioner styles so they can be restored when alignItemWithTrigger
  // falls back to regular anchoring.
  watch(
    [() => positionerElement.value, () => popupRef.current],
    () => {
      if (
        !positionerElement.value ||
        !popupRef.current ||
        Object.keys(originalPositionerStylesRef.current).length
      ) {
        return;
      }

      const positionerEl = positionerElement.value;
      originalPositionerStylesRef.current = {
        top: positionerEl.style.top || '0',
        left: positionerEl.style.left || '0',
        right: positionerEl.style.right,
        height: positionerEl.style.height,
        bottom: positionerEl.style.bottom,
        minHeight: positionerEl.style.minHeight,
        maxHeight: positionerEl.style.maxHeight,
        marginTop: positionerEl.style.marginTop,
        marginBottom: positionerEl.style.marginBottom,
      };
    },
    { immediate: true },
  );

  watch(
    [() => open.value, () => positionerContext.value.alignItemWithTriggerActive, () => positionerElement.value],
    () => {
      if (open.value || positionerContext.value.alignItemWithTriggerActive) {
        return;
      }

      initialPlacedRef.current = false;
      reachedMaxHeightRef.current = false;
      clearStyles(positionerElement.value, originalPositionerStylesRef.current);
    },
    { immediate: true },
  );

  // Core alignment layout pass. JSDOM cannot measure geometry, so this mostly no-ops there,
  // but the code must not throw.
  watch(
    [
      () => open.value,
      () => triggerElement.value,
      () => positionerElement.value,
      () => popupRef.current,
      () => positionerContext.value.alignItemWithTriggerActive,
      () => positionerContext.value.isPositioned,
      () => selectedItemTextRef.current,
      () => firstItemTextRef.current,
      () => valueRef.current,
      () => listElement.value,
      () => highlightItemOnHover,
      () => direction.value,
    ],
    () => {
      const popupElement = popupRef.current;

      // Wait for Floating UI's first positioning pass before reading DOM geometry.
      if (
        !open.value ||
        !triggerElement.value ||
        !positionerElement.value ||
        !popupElement ||
        (positionerContext.value.alignItemWithTriggerActive && !positionerContext.value.isPositioned) ||
        store.state.transitionStatus === 'ending'
      ) {
        return;
      }

      initialPlacedRef.current = true;
      popupElement.style.removeProperty('--transform-origin');

      if (!positionerContext.value.alignItemWithTriggerActive) {
        // The wrapper supplies the scroller: the list owns scrolling once it has mounted, and
        // this effect re-runs (cancelling the stale frame) when that happens.
        scrollArrowFrame.request(() => handleScrollArrowVisibility(listElement.value || popupElement));
        return;
      }

      // Ensure we remove any transforms that can affect the location of the popup.
      const restoreTransformStyles = unsetTransformStyles(popupElement);

      try {
        let textElement = selectedItemTextRef.current;

        if (!textElement?.isConnected) {
          const hasSelectedValue = selectors.hasSelectedValue(store.state);
          textElement =
            !hasSelectedValue && firstItemTextRef.current?.isConnected
              ? firstItemTextRef.current
              : null;
        }

        const valueElement = valueRef.current;

        const win = ownerWindow(positionerElement.value);
        const positionerStyles = win.getComputedStyle(positionerElement.value);
        const popupStyles = win.getComputedStyle(popupElement);

        const doc = ownerDocument(triggerElement.value);
        const scale = getScale(triggerElement.value);
        const triggerRect = normalizeRect(triggerElement.value.getBoundingClientRect(), scale);

        const positionerRect = normalizeRect(positionerElement.value.getBoundingClientRect(), scale);
        const triggerHeight = triggerRect.height;
        const scroller = listElement.value || popupElement;
        const scrollHeight = scroller.scrollHeight;

        const borderBottom = parseFloat(popupStyles.borderBottomWidth);
        const marginTop = parseFloat(positionerStyles.marginTop) || 10;
        const marginBottom = parseFloat(positionerStyles.marginBottom) || 10;
        const minHeight = parseFloat(positionerStyles.minHeight) || 100;
        const maxPopupHeight = getMaxPopupHeight(popupStyles);

        const paddingLeft = 5;
        const paddingRight = 5;
        const triggerCollisionThreshold = 20;

        const viewportHeight = doc.documentElement.clientHeight - marginTop - marginBottom;
        const viewportWidth = doc.documentElement.clientWidth;
        const availableSpaceBeneathTrigger = viewportHeight - triggerRect.bottom + triggerHeight;

        let textRect: ClientRectObject | undefined;
        let alignedLeft =
          direction.value === 'rtl' ? triggerRect.right - positionerRect.width : triggerRect.left;
        let offsetY = 0;

        if (textElement && valueElement) {
          const valueRect = normalizeRect(valueElement.getBoundingClientRect(), scale);
          textRect = normalizeRect(textElement.getBoundingClientRect(), scale);

          alignedLeft =
            positionerRect.left +
            (direction.value === 'rtl' ? valueRect.right - textRect.right : valueRect.left - textRect.left);
          const valueCenterFromTriggerTop = valueRect.top - triggerRect.top + valueRect.height / 2;
          const textCenterFromPositionerTop = textRect.top - positionerRect.top + textRect.height / 2;

          offsetY = textCenterFromPositionerTop - valueCenterFromTriggerTop;
        }

        const idealHeight = availableSpaceBeneathTrigger + offsetY + marginBottom + borderBottom;
        let height = Math.min(viewportHeight, idealHeight);
        const maxHeight = viewportHeight - marginTop - marginBottom;
        const scrollTop = idealHeight - height;

        const maxRight = viewportWidth - paddingRight;

        positionerElement.value.style.left = `${clamp(
          alignedLeft,
          paddingLeft,
          maxRight - positionerRect.width,
        )}px`;
        positionerElement.value.style.height = `${height}px`;
        positionerElement.value.style.maxHeight = 'none';
        positionerElement.value.style.marginTop = `${marginTop}px`;
        positionerElement.value.style.marginBottom = `${marginBottom}px`;
        popupElement.style.height = '100%';

        const maxScrollTop = getMaxScrollTop(scroller);
        const isTopPositioned = scrollTop >= maxScrollTop - SCROLL_EDGE_TOLERANCE_PX;

        if (isTopPositioned) {
          height = Math.min(viewportHeight, positionerRect.height) - (scrollTop - maxScrollTop);
        }

        const fallbackToAlignPopupToTrigger =
          triggerRect.top < triggerCollisionThreshold ||
          triggerRect.bottom > viewportHeight - triggerCollisionThreshold ||
          Math.ceil(height) + SCROLL_EDGE_TOLERANCE_PX < Math.min(scrollHeight, minHeight);

        const isPinchZoomed = (win.visualViewport?.scale ?? 1) !== 1 && platform.engine.webkit;

        if (fallbackToAlignPopupToTrigger || isPinchZoomed) {
          clearStyles(positionerElement.value, originalPositionerStylesRef.current);
          positionerContext.value.setControlledAlignItemWithTrigger(false);
          return;
        }

        const initialHeight = Math.max(minHeight, height);

        if (isTopPositioned) {
          const topOffset = Math.max(0, viewportHeight - idealHeight);
          positionerElement.value.style.top = positionerRect.height >= maxHeight ? '0' : `${topOffset}px`;
          positionerElement.value.style.height = `${height}px`;
          scroller.scrollTop = getMaxScrollTop(scroller);
        } else {
          positionerElement.value.style.bottom = '0';
          scroller.scrollTop = scrollTop;
        }

        if (textRect) {
          const popupTop = positionerRect.top;
          const popupHeight = positionerRect.height;
          const textCenterY = textRect.top + textRect.height / 2;

          const clampedY = clamp(
            popupHeight > 0 ? ((textCenterY - popupTop) / popupHeight) * 100 : 50,
            0,
            100,
          );

          popupElement.style.setProperty('--transform-origin', `50% ${clampedY}%`);
        }

        if (initialHeight === viewportHeight || height >= maxPopupHeight) {
          reachedMaxHeightRef.current = true;
        }

        handleScrollArrowVisibility(scroller);

        if (
          highlightItemOnHover &&
          store.state.selectedIndex === null &&
          store.state.activeIndex === null &&
          listRef.current[0] != null
        ) {
          store.set('activeIndex', 0);
        }
      } finally {
        restoreTransformStyles();
      }
    },
    { immediate: true },
  );

  // Close the aligned popup when the window is resized.
  watch(
    [() => positionerContext.value.alignItemWithTriggerActive, () => positionerElement.value, open],
    ([isAligned, positionerEl, isOpen], _old, onCleanup) => {
      if (!isAligned || !positionerEl || !isOpen) {
        return undefined;
      }

      const win = ownerWindow(positionerEl);

      function handleResize(event: UIEvent) {
        setOpen(false, createChangeEventDetails(REASONS.windowResize, event));
      }

      return addEventListener(win, 'resize', handleResize);
    },
  );

  const getDefaultProps = (): HTMLProps => ({
    ...(listElement.value
      ? {
          role: 'presentation',
          'aria-orientation': undefined,
        }
      : {
          role: 'listbox',
          'aria-multiselectable': multiple || undefined,
          id: `${id.value}-list`,
        }),
    onKeyDown(event: KeyboardEvent) {
      if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
        event.stopPropagation();
      }
    },
    onScroll(event: Event) {
      if (listElement.value) {
        return;
      }
      handleScroll(event.currentTarget as HTMLDivElement);
    },
    ...(positionerContext.value.alignItemWithTriggerActive && {
      style: listElement.value ? { height: '100%' } : LIST_FUNCTIONAL_STYLES,
    }),
    className:
      !listElement.value && positionerContext.value.alignItemWithTriggerActive
        ? styleDisableScrollbar.className
        : undefined,
  });

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, popupRef],
    state,
    stateAttributesMapping,
    props: [
      // Store-reactive props must be re-evaluated per render (setup would snapshot them).
      (prev: any) => ({ ...prev, ...popupProps.value }),
      (prev: any) => ({ ...prev, ...getDefaultProps() }),
      (prev: any) => ({ ...prev, ...getDisabledMountTransitionStyles(transitionStatus.value) }),
      elementProps,
    ],
  });

  // The focus manager's `disabled` is a mount-time snapshot in the ActView port, so it must be
  // conditionally mounted only while the popup is mounted (plantform-diff.md AD-28).
  const shouldRenderFocusManager = computed(() => mounted.value);

  return (
    <>
      {!disableStyleElements.value && styleDisableScrollbar.getElement(nonce.value)}
      {shouldRenderFocusManager.value ? (
        <FloatingFocusManager
          context={floatingRootContext}
          modal={false}
          disabled={false}
          openInteractionType={openMethod.value}
          returnFocus={finalFocus}
          restoreFocus
        >
          {getElement() as VNode}
        </FloatingFocusManager>
      ) : (
        getElement()
      )}
    </>
  );
}

export interface SelectPopupProps extends BaseUIComponentProps<'div', SelectPopupState> {
  children?: any;
  /**
   * Determines the element to focus when the select popup is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | { current: HTMLElement | null; value?: HTMLElement | null }
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
}

export interface SelectPopupState {
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side | 'none';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the component is open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace SelectPopup {
  export type Props = SelectPopupProps;
  export type State = SelectPopupState;
}

function getMaxPopupHeight(popupStyles: CSSStyleDeclaration) {
  const maxHeightStyle = popupStyles.maxHeight;
  return maxHeightStyle.endsWith('px') ? parseFloat(maxHeightStyle) || Infinity : Infinity;
}

function getMaxScrollTop(scroller: HTMLElement) {
  return getMaxScrollOffset(scroller.scrollHeight, scroller.clientHeight);
}

function getScale(element: HTMLElement) {
  // The platform API is async-capable, but the DOM platform returns a plain scale object.
  return floatingPlatform.getScale(element) as { x: number; y: number };
}

function normalizeSize(size: number, axis: 'x' | 'y', scale: { x: number; y: number }) {
  return size / scale[axis];
}

function normalizeRect(
  rect: DOMRect | DOMRectReadOnly,
  scale: { x: number; y: number },
): ClientRectObject {
  return rectToClientRect({
    x: normalizeSize(rect.x, 'x', scale),
    y: normalizeSize(rect.y, 'y', scale),
    width: normalizeSize(rect.width, 'x', scale),
    height: normalizeSize(rect.height, 'y', scale),
  });
}

const TRANSFORM_STYLE_RESETS = [
  ['transform', 'none'],
  ['scale', '1'],
  ['translate', '0 0'],
] as const;

type TransformStyleProperty = (typeof TRANSFORM_STYLE_RESETS)[number][0];

function unsetTransformStyles(popupElement: HTMLElement) {
  const { style } = popupElement;
  const originalStyles = {} as Record<TransformStyleProperty, string>;

  for (const [property, value] of TRANSFORM_STYLE_RESETS) {
    originalStyles[property] = style.getPropertyValue(property);
    style.setProperty(property, value, 'important');
  }

  return () => {
    for (const [property] of TRANSFORM_STYLE_RESETS) {
      const originalValue = originalStyles[property];
      if (originalValue) {
        style.setProperty(property, originalValue);
      } else {
        style.removeProperty(property);
      }
    }
  };
}

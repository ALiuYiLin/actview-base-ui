import { computed, watch } from 'actview';
import type { VNode } from '@actview/jsx';
import { getNodeName, isHTMLElement } from '@floating-ui/utils/dom';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { mergeCleanups } from '@base-ui/actview-utils/mergeCleanups';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { platform } from '@base-ui/actview-utils/platform';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import { useAnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import { ownerDocument, ownerWindow } from '@base-ui/actview-utils/owner';
import { renderFocusGuard } from '../../utils/FocusGuard';
import {
  activeElement,
  contains,
  getTarget,
  isTypeableCombobox,
  getFloatingFocusElement,
  isTypeableElement,
} from '../utils/element';
import { isVirtualClick, isVirtualPointerEvent, stopEvent } from '../utils/event';
import {
  tabbable,
  focusable,
  isOutsideEvent,
  isTabbable,
  getNextTabbable,
  getPreviousTabbable,
  type FocusableElement,
} from '../utils/tabbable';
import { getNodeAncestors, getNodeChildren } from '../utils/nodes';
import { isElementVisible } from '../utils/composite';
import type { FloatingContext, FloatingRootContext } from '../types';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { createAttribute } from '../utils/createAttribute';
import { enqueueFocus } from '../utils/enqueueFocus';
import { markOthers } from '../utils/markOthers';
import { usePortalContext } from './FloatingPortal';
import { useFloatingTree } from './FloatingTree';
import { FloatingTreeStore } from '../components/FloatingTreeStore';
import { CLICK_TRIGGER_IDENTIFIER } from '../../internals/constants';
import type { FloatingUIOpenChangeDetails } from '../../internals/types';
import { resolveRef } from '../../utils/resolveRef';

function getEventType(event: Event, lastInteractionType?: InteractionType): InteractionType {
  const win = ownerWindow(getTarget(event));
  if (event instanceof win.KeyboardEvent) {
    return 'keyboard';
  }
  if (event instanceof win.FocusEvent) {
    // Focus events can be caused by a preceding pointer interaction (e.g., focusout on outside press).
    // Prefer the last known pointer type if provided, else treat as keyboard.
    return lastInteractionType || 'keyboard';
  }
  if ('pointerType' in event) {
    return (event.pointerType as InteractionType) || 'keyboard';
  }
  if ('touches' in event) {
    return 'touch';
  }
  if (event instanceof win.MouseEvent) {
    // onClick events may not contain pointer events, and will fall through to here
    return lastInteractionType || (event.detail === 0 ? 'keyboard' : 'mouse');
  }
  return '';
}

const LIST_LIMIT = 20;
let previouslyFocusedElements: WeakRef<Element>[] = [];

function clearDisconnectedPreviouslyFocusedElements() {
  previouslyFocusedElements = previouslyFocusedElements.filter((entry) => {
    return entry.deref()?.isConnected;
  });
}

function addPreviouslyFocusedElement(element: Element | null | undefined) {
  clearDisconnectedPreviouslyFocusedElements();
  if (element && getNodeName(element) !== 'body') {
    previouslyFocusedElements.push(new WeakRef(element));
    if (previouslyFocusedElements.length > LIST_LIMIT) {
      previouslyFocusedElements = previouslyFocusedElements.slice(-LIST_LIMIT);
    }
  }
}

function getPreviouslyFocusedElement() {
  clearDisconnectedPreviouslyFocusedElements();
  return previouslyFocusedElements[previouslyFocusedElements.length - 1]?.deref();
}

function getFirstTabbableElement(container: Element | null) {
  if (!container) {
    return null;
  }

  if (isTabbable(container)) {
    return container;
  }

  return tabbable(container)[0] || container;
}

function handleTabIndex(floatingFocusElement: HTMLElement) {
  if (
    floatingFocusElement.hasAttribute('tabindex') &&
    !floatingFocusElement.hasAttribute('data-tabindex')
  ) {
    return;
  }

  if (!floatingFocusElement.getAttribute('role')?.includes('dialog')) {
    return;
  }

  const focusableElements = focusable(floatingFocusElement);
  const tabbableContent = focusableElements.filter((element) => {
    const dataTabIndex = element.getAttribute('data-tabindex') || '';
    return (
      isTabbable(element) ||
      (element.hasAttribute('data-tabindex') && !dataTabIndex.startsWith('-'))
    );
  });
  const tabIndex = floatingFocusElement.getAttribute('tabindex');

  if (tabbableContent.length === 0) {
    if (tabIndex !== '0') {
      floatingFocusElement.setAttribute('tabindex', '0');
      // Mark our own write so the externally-managed early-return above doesn't
      // mistake it for a user-authored `tabindex` and freeze management.
      floatingFocusElement.setAttribute('data-tabindex', '0');
    }
  } else if (
    tabIndex !== '-1' ||
    (floatingFocusElement.hasAttribute('data-tabindex') &&
      floatingFocusElement.getAttribute('data-tabindex') !== '-1')
  ) {
    floatingFocusElement.setAttribute('tabindex', '-1');
    floatingFocusElement.setAttribute('data-tabindex', '-1');
  }
}

export interface FloatingFocusManagerProps {
  children: VNode;
  /**
   * The floating context returned from `useFloatingRootContext`.
   */
  context: FloatingRootContext | FloatingContext;
  /**
   * The interaction type used to open the floating element.
   */
  openInteractionType?: InteractionType | null | undefined;
  /**
   * Whether or not the focus manager should be disabled. Useful to delay focus
   * management until after a transition completes or some other conditional
   * state.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Determines the element to focus when the floating element is opened.
   * @default true
   */
  initialFocus?:
    | boolean
    | { current: HTMLElement | null }
    | ((openType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the floating element is closed.
   * @default true
   */
  returnFocus?:
    | boolean
    | { current: HTMLElement | null }
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines where focus should be restored if focus inside the floating element is lost.
   * @default false
   */
  restoreFocus?: boolean | 'popup' | undefined;
  /**
   * Determines if focus is “modal”, meaning focus is fully trapped inside the
   * floating element and outside content cannot be accessed. This includes
   * screen reader virtual cursors.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Determines whether `focusout` event listeners that control whether the
   * floating element should be closed if the focus moves outside of it are
   * attached to the reference and floating elements. This affects non-modal
   * focus management.
   * @default true
   */
  closeOnFocusOut?: boolean | undefined;
  /**
   * Overrides the element to focus when tabbing forward out of the floating element.
   */
  nextFocusableElement?: HTMLElement | { current: HTMLElement | null } | null | undefined;
  /**
   * Overrides the element to focus when tabbing backward out of the floating element.
   */
  previousFocusableElement?: HTMLElement | { current: HTMLElement | null } | null | undefined;
  /**
   * Ref to the focus guard preceding the floating element content.
   * Can be useful to focus the popup programmatically.
   */
  beforeContentFocusGuardRef?: { current: HTMLSpanElement | null } | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Additional elements that should be treated as part of the floating subtree
   * even if they are rendered outside the floating element itself.
   */
  getInsideElements?: (() => Array<Element | null | undefined>) | undefined;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 * @internal
 */
export function FloatingFocusManager(props: FloatingFocusManagerProps) {
  const {
    context,
    children,
    disabled = false,
    initialFocus = true,
    returnFocus = true,
    restoreFocus = false,
    modal = true,
    closeOnFocusOut = true,
    openInteractionType = '',
    nextFocusableElement,
    previousFocusableElement,
    beforeContentFocusGuardRef,
    externalTree,
    getInsideElements,
  } = props;

  const store = 'rootStore' in context ? context.rootStore : context;

  const open = store.useState('open');
  const domReference = store.useState('domReferenceElement');
  const floating = store.useState('floatingElement');
  const { events, dataRef } = store.context;

  const getNodeId = () => dataRef.current.floatingContext?.nodeId;

  const ignoreInitialFocus = initialFocus === false;
  // A typeable combobox reference (e.g. input/textarea) with `initialFocus={false}`
  // has different focus semantics: focus is not trapped inside the floating element,
  // so in the modal case the guards are not rendered, but `aria-hidden` is still
  // applied to the outside nodes.
  const isUntrappedTypeableCombobox = computed(
    () => isTypeableCombobox(domReference.value) && ignoreInitialFocus,
  );

  const initialFocusRef = useValueAsRef(initialFocus);
  const returnFocusRef = useValueAsRef(returnFocus);
  const openInteractionTypeRef = useValueAsRef(openInteractionType);
  const openRef = useValueAsRef(open);

  const tree = useFloatingTree(externalTree);
  const portalContext = usePortalContext();

  const preventReturnFocusRef = { current: false };
  const isPointerDownRef = { current: false };
  const pointerDownOutsideRef = { current: false };
  const lastFocusedTabbableRef = { current: null as FocusableElement | null };
  const closeTypeRef = { current: '' as InteractionType };
  const lastInteractionTypeRef = { current: '' as InteractionType };

  const beforeGuardRef = { current: null as HTMLSpanElement | null };
  const afterGuardRef = { current: null as HTMLSpanElement | null };

  const mergedBeforeGuardRef = useMergedRefs(
    beforeGuardRef,
    beforeContentFocusGuardRef,
    portalContext?.beforeInsideRef,
  );
  const mergedAfterGuardRef = useMergedRefs(afterGuardRef, portalContext?.afterInsideRef);

  const blurTimeout = useTimeout();
  const pointerDownTimeout = useTimeout();
  const restoreFocusFrame = useAnimationFrame();

  const isInsidePortal = portalContext != null;
  const floatingFocusElement = computed(() => getFloatingFocusElement(floating.value));

  const getTabbableContent = (container: Element | null = floatingFocusElement.value) => {
    return container ? tabbable(container) : [];
  };

  const getResolvedInsideElements = () =>
    getInsideElements?.().filter((element): element is Element => element != null) ?? [];

  // Prevent Tab from escaping the modal when there are no tabbable elements.
  watch([floatingFocusElement, isUntrappedTypeableCombobox], (newVals: any) => {
    const [focusElement, untrapped] = Array.isArray(newVals) ? newVals : [];
    if (disabled || !modal) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        // The focus guards have nothing to focus, so we need to stop the event.
        if (
          contains(focusElement, activeElement(ownerDocument(focusElement))) &&
          getTabbableContent().length === 0 &&
          !untrapped
        ) {
          stopEvent(event);
        }
      }
    }

    const doc = ownerDocument(focusElement);
    return addEventListener(doc, 'keydown', onKeyDown);
  });

  // Track pointer/keyboard interactions to disambiguate focus and outside presses.
  watch(
    [open, floating, domReference, floatingFocusElement],
    (newVals: any, _old, onCleanup) => {
      const [openValue, floatingValue, domReferenceValue, focusElement] = Array.isArray(newVals)
        ? newVals
        : [];
      if (disabled || !openValue) {
        return;
      }

      const doc = ownerDocument(focusElement);

      function clearPointerDownOutside() {
        pointerDownOutsideRef.current = false;
      }

      function onPointerDown(event: PointerEvent) {
        const target = getTarget(event) as Element | null;
        const insideElements = getResolvedInsideElements();
        const pointerTargetInside =
          contains(floatingValue, target) ||
          contains(domReferenceValue, target) ||
          contains(portalContext?.portalNode ?? null, target) ||
          insideElements.some((element) => element === target || contains(element, target));
        pointerDownOutsideRef.current = !pointerTargetInside;
        lastInteractionTypeRef.current = (event.pointerType as InteractionType) || 'keyboard';

        if (target?.closest(`[${CLICK_TRIGGER_IDENTIFIER}]`)) {
          isPointerDownRef.current = true;
          // Reset on the next tick so a single click on a click-trigger doesn't
          // permanently suppress focus-out closing for the lifetime of the instance.
          pointerDownTimeout.start(0, () => {
            isPointerDownRef.current = false;
          });
        }
      }

      function onKeyDown() {
        lastInteractionTypeRef.current = 'keyboard';
      }

      onCleanup(
        mergeCleanups(
          addEventListener(doc, 'pointerdown', onPointerDown, true),
          addEventListener(doc, 'pointerup', clearPointerDownOutside, true),
          addEventListener(doc, 'pointercancel', clearPointerDownOutside, true),
          addEventListener(doc, 'keydown', onKeyDown, true),
          // Avoid a stale `true` leaking into the next open (e.g. keep-mounted popups)
          // if the popup dismissed between pointerdown and pointerup.
          clearPointerDownOutside,
        ),
      );
    },
  );

  // Close on focus out and restore focus within the floating tree when needed.
  watch(
    [floating, domReference, floatingFocusElement],
    (newVals: any, _old, onCleanup) => {
      const [floatingValue, domReferenceValue, focusElement] = (
        Array.isArray(newVals) ? newVals : []
      ) as [HTMLElement | null, Element | null, HTMLElement | null];
      if (disabled || !closeOnFocusOut) {
        return;
      }

      const doc = ownerDocument(focusElement);

      // In Safari, buttons lose focus when pressing them.
      function handlePointerDown() {
        isPointerDownRef.current = true;
        pointerDownTimeout.start(0, () => {
          isPointerDownRef.current = false;
        });
      }

      function handleFocusIn(event: FocusEvent) {
        const target = getTarget(event) as FocusableElement | null;
        if (isTabbable(target)) {
          lastFocusedTabbableRef.current = target;
        }
      }

      function handleFocusOutside(event: FocusEvent) {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        const currentTarget = event.currentTarget;
        const target = getTarget(event) as HTMLElement | null;

        // When focus is lost to the body (e.g. on a backdrop press), record the element that
        // had focus so a confirmation dialog opened while the body is focused can return focus
        // to it. Scoped to `modal` to avoid non-modal popups polluting the shared stack.
        if (modal && relatedTarget == null && target != null && contains(floatingValue, target)) {
          addPreviouslyFocusedElement(target);
        }

        queueMicrotask(() => {
          const nodeId = getNodeId();
          const triggers = store.context.triggerElements;
          const insideElements = getResolvedInsideElements();
          const isRelatedFocusGuard =
            relatedTarget?.hasAttribute(createAttribute('focus-guard')) &&
            [
              beforeGuardRef.current,
              afterGuardRef.current,
              portalContext?.beforeInsideRef.current,
              portalContext?.afterInsideRef.current,
              portalContext?.beforeOutsideRef.current,
              portalContext?.afterOutsideRef.current,
              resolveRef(previousFocusableElement),
              resolveRef(nextFocusableElement),
            ].includes(relatedTarget);

          const movedToUnrelatedNode = !(
            contains(domReferenceValue, relatedTarget) ||
            contains(floatingValue, relatedTarget) ||
            contains(relatedTarget, floatingValue) ||
            contains(portalContext?.portalNode ?? null, relatedTarget) ||
            insideElements.some(
              (element) => element === relatedTarget || contains(element, relatedTarget),
            ) ||
            triggers.hasMatchingElement((trigger) => contains(trigger, relatedTarget)) ||
            isRelatedFocusGuard ||
            (tree &&
              (getNodeChildren(tree.nodesRef.current, nodeId).find(
                (node) =>
                  contains(node.context?.elements.floating, relatedTarget) ||
                  contains(node.context?.elements.domReference, relatedTarget),
              ) ||
                getNodeAncestors(tree.nodesRef.current, nodeId).find(
                  (node) =>
                    [
                      node.context?.elements.floating,
                      getFloatingFocusElement(node.context?.elements.floating),
                    ].includes(relatedTarget) ||
                    node.context?.elements.domReference === relatedTarget,
                )))
          );

          if (currentTarget === domReferenceValue && focusElement) {
            handleTabIndex(focusElement);
          }

          // Restore focus to the previously focused tabbable element to prevent
          // focus from being lost outside the floating tree.
          if (
            restoreFocus &&
            currentTarget !== domReferenceValue &&
            !isElementVisible(target) &&
            activeElement(doc) === doc.body
          ) {
            // Let `FloatingPortal` effect knows that focus is still inside the
            // floating tree.
            if (isHTMLElement(focusElement)) {
              focusElement.focus();
              // If explicitly requested to restore focus to the popup container, do not search
              // for the next/previous tabbable element.
              if (restoreFocus === 'popup') {
                // If the focused element is removed on pointerdown, the browser
                // tries to move focus to it right after the `.focus()` call above,
                // but because it's removed in the same tick, focus is lost instead.
                // Re-focusing asynchronously (next frame) wins that race.
                restoreFocusFrame.request(() => {
                  focusElement.focus();
                });
                return;
              }
            }

            const tabbableContent = getTabbableContent() as Array<Element | null>;
            const prevTabbable = lastFocusedTabbableRef.current;
            const nodeToFocus =
              (prevTabbable && tabbableContent.includes(prevTabbable) ? prevTabbable : null) ||
              tabbableContent[tabbableContent.length - 1] ||
              focusElement;

            if (isHTMLElement(nodeToFocus)) {
              nodeToFocus.focus();
            }
          }

          // https://github.com/floating-ui/floating-ui/issues/3060
          if (dataRef.current.insideReactTree) {
            dataRef.current.insideReactTree = false;
            return;
          }

          // Focus did not move inside the floating tree, and there are no tabbable
          // portal guards to handle closing.
          if (
            (isUntrappedTypeableCombobox.value ? true : !modal) &&
            relatedTarget &&
            movedToUnrelatedNode &&
            !isPointerDownRef.current &&
            (isUntrappedTypeableCombobox.value || relatedTarget !== getPreviouslyFocusedElement())
          ) {
            preventReturnFocusRef.current = true;
            store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
          }
        });
      }

      function markInsideReactTree() {
        if (pointerDownOutsideRef.current) {
          return;
        }
        dataRef.current.insideReactTree = true;
        blurTimeout.start(0, () => {
          dataRef.current.insideReactTree = false;
        });
      }

      const domReferenceElement = isHTMLElement(domReferenceValue) ? domReferenceValue : null;
      if (!floatingValue && !domReferenceElement) {
        return;
      }

      onCleanup(
        mergeCleanups(
          domReferenceElement &&
            addEventListener(domReferenceElement, 'focusout', handleFocusOutside),
          domReferenceElement &&
            addEventListener(domReferenceElement, 'pointerdown', handlePointerDown),
          floatingValue && addEventListener(floatingValue, 'focusin', handleFocusIn),
          floatingValue && addEventListener(floatingValue, 'focusout', handleFocusOutside),
          floatingValue &&
            portalContext &&
            addEventListener(floatingValue, 'focusout', markInsideReactTree, true),
        ),
      );
    },
  );

  // Hide everything outside the floating tree from assistive tech while open.
  watch(
    [open, floating, domReference, isUntrappedTypeableCombobox],
    (newVals: any, _old, onCleanup) => {
      const [openValue, floatingValue, domReferenceValue, untrapped] = Array.isArray(newVals)
        ? newVals
        : [];
      if (disabled || !floatingValue || !openValue) {
        return;
      }

      // Don't hide portals nested within the parent portal.
      const portalNodes = Array.from(
        portalContext?.portalNode?.querySelectorAll(`[${createAttribute('portal')}]`) || [],
      );

      const ancestors = tree ? getNodeAncestors(tree.nodesRef.current, getNodeId()) : [];
      const rootAncestorComboboxDomReference = ancestors.find((node) =>
        isTypeableCombobox(node.context?.elements.domReference || null),
      )?.context?.elements.domReference;

      const controlInsideElements = [
        floatingValue,
        ...portalNodes,
        beforeGuardRef.current,
        afterGuardRef.current,
        portalContext?.beforeOutsideRef.current,
        portalContext?.afterOutsideRef.current,
        ...getResolvedInsideElements(),
      ];
      const insideElements = [
        ...controlInsideElements,
        rootAncestorComboboxDomReference,
        resolveRef(previousFocusableElement),
        resolveRef(nextFocusableElement),
        untrapped ? domReferenceValue : null,
      ].filter((x): x is Element => x != null);

      const ariaHiddenCleanup = markOthers(insideElements, {
        ariaHidden: modal || untrapped,
        mark: false,
      });

      const markerInsideElements = [floatingValue, ...portalNodes].filter(
        (x): x is Element => x != null,
      );
      const markerCleanup = markOthers(markerInsideElements);

      onCleanup(() => {
        markerCleanup();
        ariaHiddenCleanup();
      });
    },
  );

  // Focus the initial element when the floating element opens.
  watch([open, floatingFocusElement], (newVals: any) => {
    const [openValue, focusElement] = Array.isArray(newVals) ? newVals : [];
    if (!openValue || disabled || !isHTMLElement(focusElement)) {
      return;
    }

    closeTypeRef.current = '';
    lastInteractionTypeRef.current = '';

    const doc = ownerDocument(focusElement);
    const previouslyFocusedElement = activeElement(doc);

    // Wait for any layout effect state setters to execute to set `tabIndex`.
    queueMicrotask(() => {
      const initialFocusValueOrFn = initialFocusRef.current;
      const resolvedInitialFocus =
        typeof initialFocusValueOrFn === 'function'
          ? initialFocusValueOrFn(openInteractionTypeRef.current || '')
          : initialFocusValueOrFn;

      // `null` should fallback to default behavior in case of an empty ref.
      if (resolvedInitialFocus === undefined || resolvedInitialFocus === false) {
        return;
      }

      const focusAlreadyInsideFloatingEl = contains(focusElement, previouslyFocusedElement);

      if (focusAlreadyInsideFloatingEl) {
        return;
      }

      let focusableElements: Array<FocusableElement> | null = null;
      const getDefaultFocusElement = () => {
        if (focusableElements == null) {
          focusableElements = getTabbableContent(focusElement);
        }

        return focusableElements[0] || focusElement;
      };

      let elToFocus: FocusableElement | null | undefined;
      if (resolvedInitialFocus === true || resolvedInitialFocus === null) {
        elToFocus = getDefaultFocusElement();
      } else {
        elToFocus = resolveRef(resolvedInitialFocus);
      }
      elToFocus = elToFocus || getDefaultFocusElement();

      const hadFocusInside = contains(focusElement, activeElement(doc));

      // enqueueFocus returns a rAF-cancel function; we intentionally don't cancel this focus.
      void enqueueFocus(elToFocus, {
        preventScroll: elToFocus === focusElement,
        shouldFocus() {
          // This focus is queued on the next animation frame. If the floating element has closed
          // before it runs — e.g. tabbing out of a kept-mounted popup — don't pull focus back
          // onto the initial element after it has legitimately moved elsewhere.
          if (!openRef.current) {
            return false;
          }

          if (hadFocusInside) {
            return true;
          }

          const currentActiveElement = activeElement(doc);
          const focusMovedInside =
            currentActiveElement !== elToFocus && contains(focusElement, currentActiveElement);

          return !focusMovedInside;
        },
      });
    });
  });

  // Track return focus targets and restore focus on unmount/close.
  watch(
    [floating, floatingFocusElement],
    (newVals: any, _old, onCleanup) => {
      const [floatingValue, focusElement] = Array.isArray(newVals) ? newVals : [];
      if (disabled || !focusElement) {
        return;
      }

      const doc = ownerDocument(focusElement);
      const elementFocusedBeforeOpen = activeElement(doc);
      // Only an explicit `null` interaction type represents a programmatic open.
      // `undefined` is normalized to `''` by the prop default, so it never reaches
      // here as nullish and is intentionally not treated as programmatic.
      const preferPreviousFocus = openInteractionTypeRef.current == null;

      addPreviouslyFocusedElement(elementFocusedBeforeOpen);

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          closeTypeRef.current = getEventType(details.nativeEvent, lastInteractionTypeRef.current);
        }

        if (details.reason === REASONS.triggerHover && details.nativeEvent.type === 'mouseleave') {
          preventReturnFocusRef.current = true;
        }

        if (details.reason !== REASONS.outsidePress) {
          return;
        }

        if (details.nested) {
          preventReturnFocusRef.current = false;
        } else if (
          isVirtualClick(details.nativeEvent as MouseEvent) ||
          isVirtualPointerEvent(details.nativeEvent as PointerEvent)
        ) {
          preventReturnFocusRef.current = false;
        } else {
          // On outside press, only return focus to the reference when the browser supports the
          // `focus({ preventScroll })` option; without it, restoring focus scrolls the page.
          let isPreventScrollSupported = false;
          ownerDocument(focusElement)
            .createElement('div')
            .focus({
              get preventScroll() {
                isPreventScrollSupported = true;
                return false;
              },
            });

          if (isPreventScrollSupported) {
            preventReturnFocusRef.current = false;
          } else {
            preventReturnFocusRef.current = true;
          }
        }
      }

      events.on('openchange', onOpenChangeLocal);

      function getReturnElement(closeType: InteractionType) {
        const returnFocusValueOrFn = returnFocusRef.current;
        let resolvedReturnFocusValue =
          typeof returnFocusValueOrFn === 'function'
            ? returnFocusValueOrFn(closeType)
            : returnFocusValueOrFn;

        // `null` should fallback to default behavior in case of an empty ref.
        if (resolvedReturnFocusValue === undefined || resolvedReturnFocusValue === false) {
          return null;
        }

        if (resolvedReturnFocusValue === null) {
          resolvedReturnFocusValue = true;
        }

        const referenceReturnElement = domReference.value?.isConnected
          ? domReference.value
          : null;
        const previousReturnElement =
          elementFocusedBeforeOpen?.isConnected && getNodeName(elementFocusedBeforeOpen) !== 'body'
            ? elementFocusedBeforeOpen
            : null;

        let defaultReturnElement = preferPreviousFocus
          ? previousReturnElement || referenceReturnElement
          : referenceReturnElement || previousReturnElement;

        if (!defaultReturnElement) {
          defaultReturnElement = getPreviouslyFocusedElement() || null;
        }

        if (typeof resolvedReturnFocusValue === 'boolean') {
          return defaultReturnElement;
        }

        return resolveRef(resolvedReturnFocusValue) || defaultReturnElement || null;
      }

      onCleanup(() => {
        events.off('openchange', onOpenChangeLocal);

        const activeEl = activeElement(doc);
        const insideElements = getResolvedInsideElements();
        const isFocusInsideFloatingTree =
          contains(floatingValue, activeEl) ||
          insideElements.some((element) => element === activeEl || contains(element, activeEl)) ||
          (tree &&
            getNodeChildren(tree.nodesRef.current, getNodeId(), false).some((node) =>
              contains(node.context?.elements.floating, activeEl),
            ));

        const returnFocusValueOrFn = returnFocusRef.current;
        const closeType = closeTypeRef.current;
        const returnElement = getReturnElement(closeType);

        queueMicrotask(() => {
          // `returnElement` if it is tabbable, otherwise its first tabbable child,
          // otherwise `returnElement` itself (which may not be tabbable at all).
          const tabbableReturnElement = getFirstTabbableElement(returnElement);
          const hasExplicitReturnFocus = typeof returnFocusValueOrFn !== 'boolean';

          if (
            returnFocusValueOrFn &&
            !preventReturnFocusRef.current &&
            isHTMLElement(tabbableReturnElement) &&
            (!hasExplicitReturnFocus &&
            tabbableReturnElement !== activeEl &&
            activeEl !== doc.body
              ? isFocusInsideFloatingTree
              : true)
          ) {
            const focusOptions: FocusOptions = { preventScroll: true };
            if (closeType === 'keyboard') {
              focusOptions.focusVisible = true;
            }
            tabbableReturnElement.focus(focusOptions);
          }

          preventReturnFocusRef.current = false;
        });
      });
    },
  );

  // Safari may randomly scroll to the bottom of the page if an input inside a popup has focus
  // when the popup unmounts from the DOM.
  // By blurring it before the popup unmounts, we can prevent this behavior.
  watch([open, floating], (newVals: any) => {
    const [openValue, floatingValue] = Array.isArray(newVals) ? newVals : [];
    if (!platform.engine.webkit || openValue || !floatingValue) {
      return;
    }

    const activeEl = activeElement(ownerDocument(floatingValue));
    if (!isHTMLElement(activeEl) || !isTypeableElement(activeEl)) {
      return;
    }

    if (contains(floatingValue, activeEl)) {
      activeEl.blur();
    }
  });

  // Synchronize the focus manager state (modal, closeOnFocusOut, open, etc.) to the
  // FloatingPortal context, which uses it to decide whether to render its own guards.
  watch([open, domReference], (newVals: any, _old, onCleanup) => {
    const [openValue, domReferenceValue] = Array.isArray(newVals) ? newVals : [];
    if (disabled || !portalContext) {
      return;
    }

    portalContext.setFocusManagerState({
      modal,
      closeOnFocusOut,
      open: openValue,
      onOpenChange: store.setOpen,
      domReference: domReferenceValue,
    });

    onCleanup(() => {
      portalContext.setFocusManagerState(null);
    });
  });

  // Keep the floating element tabIndex in sync and clear stale focus records.
  watch([floatingFocusElement], (newVals: any, _old, onCleanup) => {
    const [focusElement] = Array.isArray(newVals) ? newVals : [];
    if (disabled || !focusElement) {
      return;
    }
    handleTabIndex(focusElement);
    onCleanup(() => {
      queueMicrotask(clearDisconnectedPreviouslyFocusedElements);
    });
  });

  const shouldRenderGuards =
    !disabled &&
    (modal ? !isUntrappedTypeableCombobox.value : true) &&
    (isInsidePortal || modal);

  return (
    <>
      {shouldRenderGuards &&
        renderFocusGuard(
          {
            'data-type': 'inside',
            onFocus: (event: FocusEvent) => {
              if (modal) {
                const els = getTabbableContent();
                // enqueueFocus returns a rAF-cancel function we don't need here.
                void enqueueFocus(els[els.length - 1]);
              } else if (portalContext?.portalNode) {
                preventReturnFocusRef.current = false;
                if (isOutsideEvent(event, portalContext.portalNode)) {
                  const nextTabbable = getNextTabbable(domReference.value);
                  nextTabbable?.focus();
                } else {
                  resolveRef(previousFocusableElement ?? portalContext.beforeOutsideRef)?.focus();
                }
              }
            },
          },
          mergedBeforeGuardRef,
        )}
      {/* Read through the props proxy so parent re-renders propagate new children (setup
          destructuring would snapshot the initial vnode). */}
      {props.children}
      {shouldRenderGuards &&
        renderFocusGuard(
          {
            'data-type': 'inside',
            onFocus: (event: FocusEvent) => {
              if (modal) {
                // enqueueFocus returns a rAF-cancel function we don't need here.
                void enqueueFocus(getTabbableContent()[0]);
              } else if (portalContext?.portalNode) {
                if (closeOnFocusOut) {
                  preventReturnFocusRef.current = true;
                }

                if (isOutsideEvent(event, portalContext.portalNode)) {
                  const prevTabbable = getPreviousTabbable(domReference.value);
                  prevTabbable?.focus();
                } else {
                  resolveRef(nextFocusableElement ?? portalContext.afterOutsideRef)?.focus();
                }
              }
            },
          },
          mergedAfterGuardRef,
        )}
    </>
  );
}

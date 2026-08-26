import {defineComponent, onUnmounted, watch, ref} from 'actview';
import { getNodeName, isHTMLElement } from '@floating-ui/utils/dom';
import { addEventListener } from '@/internals/addEventListener';
import { mergeCleanups } from '@/internals/mergeCleanups';
import { useValueAsRef } from '@/utils/useValueAsRef';
import { useStableCallback } from '@/utils/useStableCallback';
import { useTimeout } from '@/utils/useTimeout';
import { platform } from '@/utils/platform';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import { useAnimationFrame } from '@actview/base-ui-utils';
import { ownerDocument, ownerWindow } from '@/internals/owner';
import { FocusGuard } from '@/utils/FocusGuard';
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
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { createAttribute } from '../utils/createAttribute';
import { enqueueFocus } from '../utils/enqueueFocus';
import { markOthers } from '../utils/markOthers';
import { useFloatingTree } from './FloatingTree';
import type { FloatingTreeStore } from './FloatingTreeStore';
import { CLICK_TRIGGER_IDENTIFIER } from '@/internals/constants';
import type { FloatingUIOpenChangeDetails } from '@/internals/types';
import { resolveRef } from '@/utils/resolveRef';
import { FloatingPortalContext, type PortalContextValue } from './FloatingPortal';
import type { Ref } from 'actview';

// actview FloatingPortal 的 context 结构：usePortalContext 返回 Ref<PortalContextValue | undefined>。
// 本地 FloatingPortal（components/FloatingPortal.tsx）provide 该 context。
export function usePortalContext(): Ref<PortalContextValue | undefined> | undefined {
  return FloatingPortalContext.use();
}

function getEventType(event: Event, lastInteractionType?: InteractionType): InteractionType {
  const win = ownerWindow(getTarget(event) as Element | null);
  if (event instanceof win.KeyboardEvent) {
    return 'keyboard';
  }
  if (event instanceof win.FocusEvent) {
    return lastInteractionType || 'keyboard';
  }
  if ('pointerType' in event) {
    return (event as any).pointerType || 'keyboard';
  }
  if ('touches' in event) {
    return 'touch';
  }
  if (event instanceof win.MouseEvent) {
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
  children: any;
  /**
   * The floating context returned from `useFloatingRootContext`.
   */
  context: FloatingRootContext | FloatingContext;
  /**
   * The interaction type used to open the floating element.
   */
  openInteractionType?: InteractionType | null | undefined;
  /**
   * Whether or not the focus manager should be disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Determines the element to focus when the floating element is opened.
   * @default true
   */
  initialFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | ((openType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the floating element is closed.
   * @default true
   */
  returnFocus?:
    | boolean
    | Ref<HTMLElement | null>
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines where focus should be restored if focus inside the floating element is lost.
   * @default false
   */
  restoreFocus?: boolean | 'popup' | undefined;
  /**
   * Determines if focus is “modal”.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Determines whether `focusout` event listeners are attached.
   * @default true
   */
  closeOnFocusOut?: boolean | undefined;
  /**
   * Overrides the element to focus when tabbing forward out of the floating element.
   */
  nextFocusableElement?: HTMLElement | Ref<HTMLElement | null> | null | undefined;
  /**
   * Overrides the element to focus when tabbing backward out of the floating element.
   */
  previousFocusableElement?: HTMLElement | Ref<HTMLElement | null> | null | undefined;
  /**
   * Ref to the focus guard preceding the floating element content.
   */
  beforeContentFocusGuardRef?: Ref<HTMLSpanElement | null> | undefined;
  /**
   * External FloatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Additional elements that should be treated as part of the floating subtree.
   */
  getInsideElements?: (() => Array<Element | null | undefined>) | undefined;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 * (actview 版：store 模式；原生 DOM 事件；useIsoLayoutEffect → watch flush post。)
 */
export const FloatingFocusManager = defineComponent(function FloatingFocusManager(
  props: FloatingFocusManagerProps,
): any {
  const {
    context,
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
  const {events, dataRef} = store.context;

  const getNodeId = useStableCallback(() => dataRef.value.floatingContext?.nodeId);

  const ignoreInitialFocus = initialFocus === false;
  // A typeable combobox reference with `initialFocus={false}` has different focus semantics.
  const isUntrappedTypeableCombobox =
    isTypeableCombobox(domReference.value) && ignoreInitialFocus;

  const initialFocusRef = ref(initialFocus as any);
  const returnFocusRef = ref(returnFocus as any);
  const openInteractionTypeRef = ref(openInteractionType as any);
  const openRef = ref(open.value);

  // props 是渲染期值（setup 快照不会随 openMethod 等变化更新），
  // 显式 watch 同步到 refs。
  watch(
    () => [openInteractionType, returnFocus, initialFocus, open.value] as const,
    () => {
      openInteractionTypeRef.value = openInteractionType as any;
      returnFocusRef.value = returnFocus as any;
      initialFocusRef.value = initialFocus as any;
      openRef.value = open.value;
    },
    {flush: 'post', immediate: true},
  );

  const tree = useFloatingTree(externalTree);
  const portalContextRef = usePortalContext();
  const portalContext = portalContextRef?.value;

  const preventReturnFocusRef = ref(false);
  const isPointerDownRef = ref(false);
  const pointerDownOutsideRef = ref(false);
  const lastFocusedTabbableRef = ref(null as FocusableElement | null);
  const closeTypeRef = ref('' as InteractionType);

  // actview 的 watch cleanup 在组件卸载时不执行（与 React effect cleanup 不同），
  // 因此 returnFocus 需要显式在 onUnmounted 中触发。
  const returnFocusCleanupRef = ref(null as (() => void) | null);
  onUnmounted(() => {
    returnFocusCleanupRef.value?.();
    returnFocusCleanupRef.value = null;
  });
  const lastInteractionTypeRef = ref('' as InteractionType);

  const beforeGuardRef = ref(null as HTMLSpanElement | null);
  const afterGuardRef = ref(null as HTMLSpanElement | null);

  const blurTimeout = useTimeout();
  const pointerDownTimeout = useTimeout();
  const restoreFocusFrame = useAnimationFrame();

  const isInsidePortal = portalContext != null;
  const floatingFocusElement = getFloatingFocusElement(floating.value);

  const getTabbableContent = useStableCallback(
    (container: Element | null = floatingFocusElement) => {
      return container ? tabbable(container) : [];
    },
  );

  const getResolvedInsideElements = useStableCallback(
    () => getInsideElements?.().filter((element): element is Element => element != null) ?? [],
  );

  // Prevent Tab from escaping the modal when there are no tabbable elements.
  watch(
    () => [disabled, modal, isUntrappedTypeableCombobox] as const,
    () => {
      if (disabled || !modal) {
        return undefined;
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Tab') {
          if (
            contains(floatingFocusElement, activeElement(ownerDocument(floatingFocusElement))) &&
            getTabbableContent().length === 0 &&
            !isUntrappedTypeableCombobox
          ) {
            stopEvent(event);
          }
        }
      }

      const doc = ownerDocument(floatingFocusElement);
      return addEventListener(doc, 'keydown', onKeyDown);
    },
    {flush: 'post', immediate: true},
  );

  // Track pointer/keyboard interactions to disambiguate focus and outside presses.
  watch(
    () => [disabled, open.value, floating.value, domReference.value, portalContext] as const,
    () => {
      if (disabled || !open.value) {
        return undefined;
      }

      const doc = ownerDocument(floatingFocusElement);

      function clearPointerDownOutside() {
        pointerDownOutsideRef.value = false;
      }

      function onPointerDown(event: PointerEvent) {
        const target = getTarget(event) as Element | null;
        const insideElements = getResolvedInsideElements();
        const pointerTargetInside =
          contains(floating.value, target) ||
          contains(domReference.value, target) ||
          contains(portalContext?.portalNode, target) ||
          insideElements.some((element) => element === target || contains(element, target));
        pointerDownOutsideRef.value = !pointerTargetInside;
        lastInteractionTypeRef.value =
          (event.pointerType as any) || 'keyboard';

        if (target?.closest(`[${CLICK_TRIGGER_IDENTIFIER}]`)) {
          isPointerDownRef.value = true;
          pointerDownTimeout.start(0, () => {
            isPointerDownRef.value = false;
          });
        }
      }

      function onKeyDown() {
        lastInteractionTypeRef.value = 'keyboard';
      }

      return mergeCleanups(
        addEventListener(doc, 'pointerdown', onPointerDown, true),
        addEventListener(doc, 'pointerup', clearPointerDownOutside, true),
        addEventListener(doc, 'pointercancel', clearPointerDownOutside, true),
        addEventListener(doc, 'keydown', onKeyDown, true),
        clearPointerDownOutside,
      );
    },
    {flush: 'post', immediate: true},
  );

  // Close on focus out and restore focus within the floating tree when needed.
  watch(
    () => [
      disabled,
      closeOnFocusOut,
      domReference.value,
      floating.value,
      floatingFocusElement,
      modal,
      tree,
      portalContext,
      store,
      restoreFocus,
      isUntrappedTypeableCombobox,
    ] as const,
    () => {
      if (disabled || !closeOnFocusOut) {
        return undefined;
      }

      const doc = ownerDocument(floatingFocusElement);

      // In Safari, buttons lose focus when pressing them.
      function handlePointerDown() {
        isPointerDownRef.value = true;
        pointerDownTimeout.start(0, () => {
          isPointerDownRef.value = false;
        });
      }

      function handleFocusIn(event: FocusEvent) {
        const target = getTarget(event) as FocusableElement | null;
        if (isTabbable(target)) {
          lastFocusedTabbableRef.value = target;
        }
      }

      function handleFocusOutside(event: FocusEvent) {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        const currentTarget = event.currentTarget;
        const target = getTarget(event) as HTMLElement | null;

        // When focus is lost to the body, record the element that had focus.
        if (modal && relatedTarget == null && target != null && contains(floating.value, target)) {
          addPreviouslyFocusedElement(target);
        }

        queueMicrotask(() => {
          const nodeId = getNodeId();
          const triggers = store.context.triggerElements;
          const insideElements = getResolvedInsideElements();
          const isRelatedFocusGuard =
            relatedTarget?.hasAttribute(createAttribute('focus-guard')) &&
            [
              beforeGuardRef.value,
              afterGuardRef.value,
              portalContext?.beforeInsideRef.value,
              portalContext?.afterInsideRef.value,
              portalContext?.beforeOutsideRef.value,
              portalContext?.afterOutsideRef.value,
              resolveRef(previousFocusableElement as any),
              resolveRef(nextFocusableElement as any),
            ].includes(relatedTarget);

          const movedToUnrelatedNode = !(
            contains(domReference.value, relatedTarget) ||
            contains(floating.value, relatedTarget) ||
            contains(relatedTarget, floating.value) ||
            contains(portalContext?.portalNode, relatedTarget) ||
            insideElements.some(
              (element) => element === relatedTarget || contains(element, relatedTarget),
            ) ||
            triggers.hasMatchingElement((trigger) => contains(trigger, relatedTarget)) ||
            isRelatedFocusGuard ||
            (tree &&
              (getNodeChildren(tree.nodesRef.value, nodeId).find(
                (node) =>
                  contains((node.context?.elements.floating as any)?.value, relatedTarget) ||
                  contains((node.context?.elements.domReference as any)?.value, relatedTarget),
              ) ||
                getNodeAncestors(tree.nodesRef.value, nodeId).find(
                  (node) => {
                    // elements.{floating,domReference} 是 store 的 computed ref
                    // （FloatingRootStore），需 .value 解包（React 版为普通对象）。
                    const ancestorFloatingElement = (node.context?.elements
                      .floating as any)?.value as HTMLElement | null | undefined;
                    return (
                      [
                        ancestorFloatingElement,
                        getFloatingFocusElement(ancestorFloatingElement),
                      ].includes(relatedTarget) ||
                      (node.context?.elements.domReference as any)?.value ===
                        relatedTarget
                    );
                  },
                )))
          );

          if (currentTarget === domReference.value && floatingFocusElement) {
            handleTabIndex(floatingFocusElement);
          }

          // Restore focus to the previously focused tabbable element to prevent
          // focus from being lost outside the floating tree.
          if (
            restoreFocus &&
            currentTarget !== domReference.value &&
            !isElementVisible(target) &&
            activeElement(doc) === doc.body
          ) {
            if (isHTMLElement(floatingFocusElement)) {
              floatingFocusElement.focus();
              if (restoreFocus === 'popup') {
                restoreFocusFrame.request(() => {
                  floatingFocusElement.focus();
                });
                return;
              }
            }

            const tabbableContent = getTabbableContent() as Array<Element | null>;
            const prevTabbable = lastFocusedTabbableRef.value;
            const nodeToFocus =
              (prevTabbable && tabbableContent.includes(prevTabbable) ? prevTabbable : null) ||
              tabbableContent[tabbableContent.length - 1] ||
              floatingFocusElement;

            if (isHTMLElement(nodeToFocus)) {
              nodeToFocus.focus();
            }
          }

          // https://github.com/floating-ui/floating-ui/issues/3060
          if (dataRef.value.insideReactTree) {
            dataRef.value.insideReactTree = false;
            return;
          }

          // Focus did not move inside the floating tree, and there are no tabbable
          // portal guards to handle closing.
          if (
            (isUntrappedTypeableCombobox ? true : !modal) &&
            relatedTarget &&
            movedToUnrelatedNode &&
            !isPointerDownRef.value &&
            (isUntrappedTypeableCombobox || relatedTarget !== getPreviouslyFocusedElement())
          ) {
            // actview 异步渲染：popup 重挂时 floatingElement state 就绪晚于
            // initialFocus 的 focus（focusout 事件先于 ref 回调），此时
            // floating 仍是上一个（已卸载）元素，relatedTarget（新 popup 内
            // 元素）与其包含关系判定不可靠——若强行关闭会把刚重开的 popup
            // 误关（rewires-dismiss 场景）。等 floatingElement 就绪后的
            // 后续 focusout 再做真实判定。
            if (floating.value && !floating.value.isConnected) {
              return;
            }
            preventReturnFocusRef.value = true;
            store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
          }
        });
      }

      function markInsideReactTree() {
        if (pointerDownOutsideRef.value) {
          return;
        }
        dataRef.value.insideReactTree = true;
        blurTimeout.start(0, () => {
          dataRef.value.insideReactTree = false;
        });
      }

      const domReferenceElement = isHTMLElement(domReference.value) ? domReference.value : null;
      if (!floating.value && !domReferenceElement) {
        return undefined;
      }

      return mergeCleanups(
        domReferenceElement &&
          addEventListener(domReferenceElement, 'focusout', handleFocusOutside),
        domReferenceElement &&
          addEventListener(domReferenceElement, 'pointerdown', handlePointerDown),
        floating.value && addEventListener(floating.value, 'focusin', handleFocusIn),
        floating.value && addEventListener(floating.value, 'focusout', handleFocusOutside),
        floating.value &&
          portalContext &&
          addEventListener(floating.value, 'focusout', markInsideReactTree, true),
      );
    },
    {flush: 'post', immediate: true},
  );

  // Hide everything outside the floating tree from assistive tech while open.
  watch(
    () => [
      open.value,
      disabled,
      floating.value,
      domReference.value,
      modal,
      portalContext,
      isUntrappedTypeableCombobox,
      tree,
    ] as const,
    () => {
      if (disabled || !floating.value || !open.value) {
        return undefined;
      }

      // Don't hide portals nested within the parent portal.
      const portalNodes = Array.from(
        portalContext?.portalNode?.querySelectorAll(`[${createAttribute('portal')}]`) || [],
      );

      const ancestors = tree ? getNodeAncestors(tree.nodesRef.value, getNodeId()) : [];
      const rootAncestorComboboxDomReference = (ancestors.find((node) =>
        isTypeableCombobox((node.context?.elements.domReference as any)?.value || null),
      )?.context?.elements.domReference as any)?.value as HTMLElement | Element | null | undefined;

      const controlInsideElements = [
        floating.value,
        ...portalNodes,
        beforeGuardRef.value,
        afterGuardRef.value,
        portalContext?.beforeOutsideRef.value,
        portalContext?.afterOutsideRef.value,
        ...getResolvedInsideElements(),
      ];
      const insideElements = [
        ...controlInsideElements,
        rootAncestorComboboxDomReference,
        resolveRef(previousFocusableElement as any),
        resolveRef(nextFocusableElement as any),
        isUntrappedTypeableCombobox ? domReference.value : null,
      ].filter((x): x is Element => x != null);

      const ariaHiddenCleanup = markOthers(insideElements, {
        ariaHidden: modal || isUntrappedTypeableCombobox,
        mark: false,
      });

      const markerInsideElements = [floating.value, ...portalNodes].filter(
        (x): x is Element => x != null,
      );
      const markerCleanup = markOthers(markerInsideElements);

      return () => {
        markerCleanup();
        ariaHiddenCleanup();
      };
    },
    {flush: 'post', immediate: true},
  );

  // Focus the initial element when the floating element opens.
  watch(
    () => [open.value, disabled, floating.value] as const,
    () => {
      // floatingFocusElement 依赖 floating.value，必须在回调内重算
      // （setup 期求值在 floating 就绪前恒为 null）。
      const floatingFocusElement = getFloatingFocusElement(floating.value);
      if (!open.value || disabled || !isHTMLElement(floatingFocusElement)) {
        return;
      }

      closeTypeRef.value = '';
      lastInteractionTypeRef.value = '';

      const doc = ownerDocument(floatingFocusElement);
      const previouslyFocusedElement = activeElement(doc);

      // Wait for any layout effect state setters to execute to set `tabIndex`.
      queueMicrotask(() => {
        const initialFocusValueOrFn = initialFocusRef.value;
        const resolvedInitialFocus =
          typeof initialFocusValueOrFn === 'function'
            ? initialFocusValueOrFn(openInteractionTypeRef.value || '')
            : initialFocusValueOrFn;

        if (resolvedInitialFocus === undefined || resolvedInitialFocus === false) {
          return;
        }

        const focusAlreadyInsideFloatingEl = contains(
          floatingFocusElement,
          previouslyFocusedElement,
        );

        if (focusAlreadyInsideFloatingEl) {
          return;
        }

        let focusableElements: Array<FocusableElement> | null = null;
        const getDefaultFocusElement = () => {
          if (focusableElements == null) {
            focusableElements = getTabbableContent(floatingFocusElement);
          }

          return focusableElements[0] || floatingFocusElement;
        };

        let elToFocus: FocusableElement | null | undefined;
        if (resolvedInitialFocus === true || resolvedInitialFocus === null) {
          elToFocus = getDefaultFocusElement();
        } else {
          elToFocus = resolveRef(resolvedInitialFocus as any);
        }
        elToFocus = elToFocus || getDefaultFocusElement();

        const hadFocusInside = contains(floatingFocusElement, activeElement(doc));

        void enqueueFocus(elToFocus, {
          preventScroll: elToFocus === floatingFocusElement,
          shouldFocus() {
            if (!openRef.value) {
              return false;
            }

            if (hadFocusInside) {
              return true;
            }

            // actview 异步渲染：open 变化时 popup 可能尚未挂载，elToFocus 仍
            // 是上一个（已卸载）popup 的 detached 元素——focus 它会触发
            // focusout（trigger → detached 元素），被 closeOnFocusOut 判为
            // movedToUnrelatedNode 而关闭刚重开的 popup。等 floating.value
            // 更新后的第二次 watch 重新 enqueueFocus（新元素 isConnected）。
            if (elToFocus && !elToFocus.isConnected) {
              return false;
            }

            const currentActiveElement = activeElement(doc);
            const focusMovedInside =
              currentActiveElement !== elToFocus &&
              contains(floatingFocusElement, currentActiveElement);

            return !focusMovedInside;
          },
        });
      });
    },
    {flush: 'post', immediate: true},
  );

  // Track return focus targets and restore focus on unmount/close.
  watch(
    () => [disabled, floating.value, open.value] as const,
    () => {
      // floatingFocusElement 依赖 floating.value，必须在回调内重算
      // （setup 期求值在 floating 就绪前恒为 null）。
      const floatingFocusElement = getFloatingFocusElement(floating.value as HTMLElement | null);
      if (disabled || !floatingFocusElement) {
        returnFocusCleanupRef.value = null;
        return undefined;
      }

      const doc = ownerDocument(floatingFocusElement);
      const elementFocusedBeforeOpen = activeElement(doc);
      // Only an explicit `null` interaction type represents a programmatic open.
      const preferPreviousFocus = openInteractionTypeRef.value == null;

      addPreviouslyFocusedElement(elementFocusedBeforeOpen);

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          closeTypeRef.value = getEventType(
            details.nativeEvent,
            lastInteractionTypeRef.value,
          );
        }

        if (
          details.reason === REASONS.triggerHover &&
          details.nativeEvent.type === 'mouseleave'
        ) {
          preventReturnFocusRef.value = true;
        }

        if (details.reason !== REASONS.outsidePress) {
          return;
        }

        if (details.nested) {
          preventReturnFocusRef.value = false;
        } else if (
          isVirtualClick(details.nativeEvent as MouseEvent) ||
          isVirtualPointerEvent(details.nativeEvent as PointerEvent)
        ) {
          preventReturnFocusRef.value = false;
        } else {
          // On outside press, only return focus to the reference when the browser
          // supports the `focus({ preventScroll })` option.
          let isPreventScrollSupported = false;
          ownerDocument(floatingFocusElement)
            .createElement('div')
            .focus({
              get preventScroll() {
                isPreventScrollSupported = true;
                return false;
              },
            } as any);

          if (isPreventScrollSupported) {
            preventReturnFocusRef.value = false;
          } else {
            preventReturnFocusRef.value = true;
          }
        }
      }

      events.on('openchange', onOpenChangeLocal);

      function getReturnElement(closeType: InteractionType) {
        const returnFocusValueOrFn = returnFocusRef.value;
        let resolvedReturnFocusValue =
          typeof returnFocusValueOrFn === 'function'
            ? returnFocusValueOrFn(closeType)
            : returnFocusValueOrFn;


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
          elementFocusedBeforeOpen?.isConnected &&
          getNodeName(elementFocusedBeforeOpen) !== 'body'
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

        return resolveRef(resolvedReturnFocusValue as any) || defaultReturnElement || null;
      }

      const cleanupFn = () => {
        events.off('openchange', onOpenChangeLocal);

        const activeEl = activeElement(doc);
        const insideElements = getResolvedInsideElements();
        const isFocusInsideFloatingTree =
          contains(floating.value, activeEl) ||
          insideElements.some(
            (element) => element === activeEl || contains(element, activeEl),
          ) ||
          (tree &&
            getNodeChildren(tree.nodesRef.value, getNodeId(), false).some((node) =>
              contains((node.context?.elements.floating as any)?.value, activeEl),
            ));

        const returnFocusValueOrFn = returnFocusRef.value;
        const closeType = closeTypeRef.value;
        const returnElement = getReturnElement(closeType);

        queueMicrotask(() => {
          const tabbableReturnElement = getFirstTabbableElement(returnElement);
          const hasExplicitReturnFocus = typeof returnFocusValueOrFn !== 'boolean';

          if (
            returnFocusValueOrFn &&
            !preventReturnFocusRef.value &&
            isHTMLElement(tabbableReturnElement) &&
            (!hasExplicitReturnFocus &&
            tabbableReturnElement !== activeEl &&
            activeEl !== doc.body
              ? isFocusInsideFloatingTree
              : true)
          ) {
            const focusOptions: FocusOptions = {preventScroll: true};
            if (closeType === 'keyboard') {
              focusOptions.focusVisible = true;
            }
            tabbableReturnElement.focus(focusOptions);
          }

          preventReturnFocusRef.value = false;
        });
      };

      returnFocusCleanupRef.value = cleanupFn;
      return cleanupFn;
    },
    {flush: 'post', immediate: true},
  );

  // Safari may randomly scroll to the bottom of the page if an input inside a popup has focus
  // when the popup unmounts from the DOM.
  watch(
    () => [open.value, floating.value] as const,
    () => {
      if (!platform.engine.webkit || open.value || !floating.value) {
        return;
      }

      const activeEl = activeElement(ownerDocument(floating.value));
      if (!isHTMLElement(activeEl) || !isTypeableElement(activeEl)) {
        return;
      }

      if (contains(floating.value, activeEl)) {
        activeEl.blur();
      }
    },
    {flush: 'post', immediate: true},
  );

  // Synchronize the focus manager state to the FloatingPortal context.
  watch(
    () => [disabled, portalContext, modal, open.value, closeOnFocusOut, domReference.value] as const,
    () => {
      if (disabled || !portalContext) {
        return undefined;
      }

      portalContext.setFocusManagerState({
        modal,
        closeOnFocusOut,
        open: open.value,
        onOpenChange: store.setOpen as any,
        domReference: domReference.value,
      });

      return () => {
        portalContext.setFocusManagerState(null);
      };
    },
    {flush: 'post', immediate: true},
  );

  // Keep the floating element tabIndex in sync and clear stale focus records.
  watch(
    () => [disabled, floatingFocusElement] as const,
    () => {
      if (disabled || !floatingFocusElement) {
        return undefined;
      }
      handleTabIndex(floatingFocusElement);
      return () => {
        queueMicrotask(clearDisconnectedPreviouslyFocusedElements);
      };
    },
    {flush: 'post', immediate: true},
  );

  const shouldRenderGuards =
    !disabled && (modal ? !isUntrappedTypeableCombobox : true) && (isInsidePortal || modal);

  return () => {
    // PD-15：children 必须在 render 期解构（props 代理追踪），
    // setup 快照会让子组件（如 Dialog.Popup 的 element vnode）永远停留首次渲染。
    const {children} = props;
    return (
      <>
      {shouldRenderGuards && (
        <FocusGuard
          data-type="inside"
          ref={(el: any) => {
            beforeGuardRef.value = el;
            if (portalContext?.beforeInsideRef) {
              portalContext.beforeInsideRef.value = el;
            }
          }}
          onFocus={(event: any) => {
            if (modal) {
              const els = getTabbableContent();
              void enqueueFocus(els[els.length - 1]);
            } else if (portalContext?.portalNode) {
              preventReturnFocusRef.value = false;
              if (isOutsideEvent(event, portalContext.portalNode)) {
                const nextTabbable = getNextTabbable(domReference.value);
                nextTabbable?.focus();
              } else {
                resolveRef(
                  (previousFocusableElement ??
                    portalContext.beforeOutsideRef) as any,
                )?.focus();
              }
            }
          }}
        />
      )}
      {children}
      {shouldRenderGuards && (
        <FocusGuard
          data-type="inside"
          ref={(el: any) => {
            afterGuardRef.value = el;
            if (portalContext?.afterInsideRef) {
              portalContext.afterInsideRef.value = el;
            }
          }}
          onFocus={(event: any) => {
            if (modal) {
              void enqueueFocus(getTabbableContent()[0]);
            } else if (portalContext?.portalNode) {
              if (closeOnFocusOut) {
                preventReturnFocusRef.value = true;
              }

              if (isOutsideEvent(event, portalContext.portalNode)) {
                const prevTabbable = getPreviousTabbable(domReference.value);
                prevTabbable?.focus();
              } else {
                resolveRef(
                  (nextFocusableElement ??
                    portalContext.afterOutsideRef) as any,
                )?.focus();
              }
            }
          }}
        />
      )}
    </>
    );
  };
});




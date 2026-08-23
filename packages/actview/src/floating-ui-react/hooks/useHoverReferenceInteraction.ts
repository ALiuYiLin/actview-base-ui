import { onUnmounted, watch } from 'actview';
import { addEventListener } from '@/internals/addEventListener';
import { mergeCleanups } from '@/internals/mergeCleanups';
import { ownerDocument } from '@/internals/owner';
import { useStableCallback } from '@/utils/useStableCallback';
import { useValueAsRef } from '@/utils/useValueAsRef';
import { isElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { FloatingUIOpenChangeDetails, HTMLProps } from '@/internals/types';
import { useFloatingTree } from '../components/FloatingTree';
import type { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { Delay, FloatingContext, FloatingRootContext } from '../types';
import { contains, getTarget } from '../utils/element';
import { isMouseLikePointerType } from '../utils/event';
import {
  applySafePolygonPointerEventsMutation,
  clearSafePolygonPointerEventsMutation,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';
import type { HandleClose, HandleCloseContextBase } from './useHoverShared';
import {
  getDelay,
  getRestMs,
  isClickLikeOpenEvent as isClickLikeOpenEventShared,
  isInsideEnabledTrigger,
} from './useHoverShared';

export interface UseHoverReferenceInteractionProps {
  enabled?: boolean | undefined;
  handleClose?: HandleClose | null | undefined;
  restMs?: number | (() => number) | undefined;
  delay?: Delay | (() => Delay) | undefined;
  move?: boolean | undefined;
  mouseOnly?: boolean | undefined;
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Whether the hook controls the active trigger. When false, the props are
   * returned under the `trigger` key.
   * @default true
   */
  isActiveTrigger?: boolean | undefined;
  triggerElementRef?: {current: Element | null} | undefined;
  getHandleCloseContext?: (() => HandleCloseContextBase | null) | undefined;
  isClosing?: (() => boolean) | undefined;
  /**
   * Called before each hover-driven open attempt. Return `false` to veto.
   */
  shouldOpen?: (() => boolean) | undefined;
  /**
   * Regression workaround (#5152): also cancels a pending hover-open from the
   * trigger's `mouseout`.
   * @default false
   */
  guardStaleOpen?: boolean | undefined;
}

const EMPTY_REF: {current: Element | null} = {current: null};

/**
 * Provides hover interactions that should be attached to reference or trigger
 * elements.
 * (actview 版：store 模式；原生 DOM 事件无 nativeEvent；flushSync → 同步调用。)
 */
export function useHoverReferenceInteraction(
  context: FloatingRootContext | FloatingContext,
  props: UseHoverReferenceInteractionProps = {},
): HTMLProps | undefined {
  const {
    enabled = true,
    delay = 0,
    handleClose = null,
    mouseOnly = false,
    restMs = 0,
    move = true,
    triggerElementRef = EMPTY_REF,
    externalTree,
    isActiveTrigger = true,
    getHandleCloseContext,
    isClosing,
    shouldOpen: shouldOpenProp,
    guardStaleOpen = false,
  } = props;

  const store = 'rootStore' in context ? context.rootStore : context;

  const {dataRef, events} = store.context;

  const tree = useFloatingTree(externalTree);

  const instance = useHoverInteractionSharedState(store);
  const isHoverCloseActiveRef = {current: false};

  const handleCloseRef = {
    current: handleClose as ((context: any) => (event: MouseEvent) => void | null) | null,
  };
  const delayRef = {current: delay as Delay | (() => Delay) | undefined};
  const restMsRef = {current: restMs as number | (() => number)};
  const enabledRef = {current: enabled};
  const shouldOpenRef = {current: shouldOpenProp as (() => boolean) | undefined};
  const isClosingRef = {current: isClosing as (() => boolean) | undefined};

  const isClickLikeOpenEvent = useStableCallback(() => {
    return isClickLikeOpenEventShared(dataRef.current.openEvent?.type, instance.interactedInside);
  });

  const checkShouldOpen = useStableCallback(() => {
    return shouldOpenRef.current?.() !== false;
  });

  const isOverInactiveTrigger = useStableCallback(
    (
      currentDomReference: Element | null,
      currentTarget: Element,
      target: EventTarget | null,
    ): boolean => {
      const allTriggers = store.context.triggerElements;

      // Fast path for normal usage where handlers are attached directly to triggers.
      if (allTriggers.hasElement(currentTarget)) {
        return !currentDomReference || !contains(currentDomReference, currentTarget);
      }

      // Fallback for delegated/wrapper usage where currentTarget may be outside the trigger map.
      if (!isElement(target)) {
        return false;
      }

      const targetElement = target as Element;
      return (
        allTriggers.hasMatchingElement((trigger) => contains(trigger, targetElement)) &&
        (!currentDomReference || !contains(currentDomReference, targetElement))
      );
    },
  );

  const cleanupMouseMoveHandler = useStableCallback(() => {
    if (!instance.handler) {
      return;
    }

    const doc = ownerDocument(store.select('domReferenceElement'));
    doc.removeEventListener('mousemove', instance.handler);
    instance.handler = undefined;
  });

  const clearPointerEvents = useStableCallback(() => {
    clearSafePolygonPointerEventsMutation(instance);
  });

  if (isActiveTrigger) {
    // eslint-disable-next-line no-underscore-dangle
    instance.handleCloseOptions = handleClose?.__options;
  }

  onUnmounted(cleanupMouseMoveHandler);

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  watch(
    () => [enabled, events, instance, cleanupMouseMoveHandler] as const,
    () => {
      if (!enabled) {
        return undefined;
      }

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          isHoverCloseActiveRef.current = details.reason === REASONS.triggerHover;
          cleanupMouseMoveHandler();
          instance.openChangeTimeout.clear();
          instance.restTimeout.clear();
          instance.blockMouseMove = true;
          instance.restTimeoutPending = false;
        } else {
          isHoverCloseActiveRef.current = false;
        }
      }

      events.on('openchange', onOpenChangeLocal);
      return () => {
        events.off('openchange', onOpenChangeLocal);
      };
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [
      enabled,
      cleanupMouseMoveHandler,
      clearPointerEvents,
      dataRef,
      delayRef,
      store,
      handleCloseRef,
      instance,
      isActiveTrigger,
      isOverInactiveTrigger,
      isClickLikeOpenEvent,
      mouseOnly,
      move,
      restMsRef,
      triggerElementRef,
      tree,
      enabledRef,
      getHandleCloseContext,
      isClosingRef,
      checkShouldOpen,
      guardStaleOpen,
    ] as const,
    () => {
      if (!enabled) {
        return undefined;
      }

      function closeWithDelay(event: MouseEvent, runElseBranch = true) {
        const closeDelay = getDelay(delayRef.current, 'close', instance.pointerType);
        if (closeDelay) {
          instance.openChangeTimeout.start(closeDelay, () => {
            store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
            tree?.events.emit('floating.closed', event);
          });
        } else if (runElseBranch) {
          instance.openChangeTimeout.clear();
          store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
          tree?.events.emit('floating.closed', event);
        }
      }

      const trigger =
        (triggerElementRef.current as HTMLElement | null) ??
        (isActiveTrigger ? (store.select('domReferenceElement') as HTMLElement | null) : null);

      if (!isElement(trigger)) {
        return undefined;
      }

      function onMouseEnter(event: MouseEvent) {
        instance.openChangeTimeout.clear();
        instance.blockMouseMove = false;

        if (mouseOnly && !isMouseLikePointerType(instance.pointerType)) {
          return;
        }

        // Only rest delay is set; there's no fallback delay.
        const restMsValue = getRestMs(restMsRef.current);
        const openDelay = getDelay(delayRef.current, 'open', instance.pointerType);
        const eventTarget = getTarget(event);
        const currentTarget = (event.currentTarget as HTMLElement) ?? null;
        const currentDomReference = store.select('domReferenceElement');
        let triggerNode = currentTarget;

        // Wrapper/delegated mode: resolve the actual trigger from the event target.
        if (isElement(eventTarget) && !store.context.triggerElements.hasElement(eventTarget)) {
          for (const triggerElement of store.context.triggerElements.elements()) {
            if (contains(triggerElement, eventTarget)) {
              triggerNode = triggerElement as HTMLElement;
              break;
            }
          }
        }

        // Wrapper/delegated mode fallback: if the wrapper contains the active trigger,
        // treat this as re-entering that active trigger.
        if (
          isElement(currentTarget) &&
          isElement(currentDomReference) &&
          !store.context.triggerElements.hasElement(currentTarget) &&
          contains(currentTarget, currentDomReference)
        ) {
          triggerNode = currentDomReference as HTMLElement;
        }

        const isOverInactive =
          triggerNode == null
            ? false
            : isOverInactiveTrigger(currentDomReference, triggerNode, eventTarget);
        const isOpen = store.select('open');
        const isInClosingTransition =
          isClosingRef.current?.() ?? store.select('transitionStatus') === 'ending';
        const isHoverCloseTransition =
          !isOpen && isInClosingTransition && isHoverCloseActiveRef.current;
        const isReenteringSameTriggerDuringCloseTransition =
          !isOverInactive &&
          isElement(triggerNode) &&
          isElement(currentDomReference) &&
          contains(currentDomReference, triggerNode) &&
          isHoverCloseTransition;
        const isRestOnlyDelay = restMsValue > 0 && !openDelay;
        const shouldOpenImmediately =
          (isOverInactive && (isOpen || isHoverCloseTransition)) ||
          isReenteringSameTriggerDuringCloseTransition;

        const shouldOpen = !isOpen || isOverInactive;

        // Open immediately when moving between triggers while open, or during
        // a hover-driven close transition (including same-trigger re-entry).
        if (shouldOpenImmediately) {
          if (checkShouldOpen()) {
            store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
          }
          return;
        }

        if (isRestOnlyDelay) {
          return;
        }

        if (openDelay) {
          instance.openChangeTimeout.start(openDelay, () => {
            if (shouldOpen && checkShouldOpen()) {
              store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
            }
          });
        } else if (shouldOpen) {
          if (checkShouldOpen()) {
            store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
          }
        }
      }

      function onMouseLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent()) {
          clearPointerEvents();
          return;
        }

        cleanupMouseMoveHandler();

        const domReferenceElement = store.select('domReferenceElement');
        const doc = ownerDocument(domReferenceElement);
        instance.restTimeout.clear();
        instance.restTimeoutPending = false;

        const handleCloseContextBase = dataRef.current.floatingContext ?? getHandleCloseContext?.();

        if (isInsideEnabledTrigger(event.relatedTarget, store.context.triggerElements)) {
          return;
        }

        if (handleCloseRef.current && handleCloseContextBase) {
          if (!store.select('open')) {
            instance.openChangeTimeout.clear();
          }

          const currentTrigger = triggerElementRef.current;

          instance.handler = handleCloseRef.current({
            ...handleCloseContextBase,
            tree,
            x: event.clientX,
            y: event.clientY,
            onClose() {
              clearPointerEvents();
              cleanupMouseMoveHandler();
              if (
                enabledRef.current &&
                !isClickLikeOpenEvent() &&
                currentTrigger === store.select('domReferenceElement')
              ) {
                closeWithDelay(event, true);
              }
            },
          }) as ((event: MouseEvent) => void) | undefined;

          if (instance.handler) {
            doc.addEventListener('mousemove', instance.handler);
            instance.handler(event);
          }

          return;
        }

        const shouldClose =
          instance.pointerType === 'touch'
            ? !contains(store.select('floatingElement'), event.relatedTarget as Element | null)
            : true;

        if (shouldClose) {
          closeWithDelay(event);
        }
      }

      // Backup cancellation for Chrome's dropped `mouseleave` — see `guardStaleOpen`.
      function onMouseOut(event: MouseEvent) {
        if (contains(trigger, event.relatedTarget as Element | null)) {
          return; // moved within the trigger's own subtree
        }
        instance.openChangeTimeout.clear();
        instance.restTimeout.clear();
        instance.restTimeoutPending = false;
      }

      const staleOpenGuard = guardStaleOpen
        ? addEventListener(trigger, 'mouseout', onMouseOut)
        : undefined;

      if (move) {
        return mergeCleanups(
          addEventListener(trigger, 'mousemove', onMouseEnter, {once: true}),
          addEventListener(trigger, 'mouseenter', onMouseEnter),
          addEventListener(trigger, 'mouseleave', onMouseLeave),
          staleOpenGuard,
        );
      }

      return mergeCleanups(
        addEventListener(trigger, 'mouseenter', onMouseEnter),
        addEventListener(trigger, 'mouseleave', onMouseLeave),
        staleOpenGuard,
      );
    },
    {flush: 'post', immediate: true},
  );

  if (!enabled) {
    return undefined;
  }

  function setPointerRef(event: any) {
    instance.pointerType = event.pointerType;
  }

  return {
    onPointerDown: setPointerRef,
    onPointerEnter: setPointerRef,
    onMouseMove(event: any) {
      const trigger = event.currentTarget as HTMLElement;

      const currentDomReference = store.select('domReferenceElement');
      const currentOpen = store.select('open');
      const isOverInactive = isOverInactiveTrigger(currentDomReference, trigger, event.target);

      if (mouseOnly && !isMouseLikePointerType(instance.pointerType)) {
        return;
      }

      if (currentOpen && isOverInactive && instance.handleCloseOptions?.blockPointerEvents) {
        const floatingElement = store.select('floatingElement');

        if (floatingElement) {
          const scopeElement =
            instance.handleCloseOptions?.getScope?.() ?? trigger.ownerDocument.body;

          applySafePolygonPointerEventsMutation(instance, {
            scopeElement,
            referenceElement: trigger,
            floatingElement,
          });
        }
      }

      const restMsValue = getRestMs(restMsRef.current);
      if ((currentOpen && !isOverInactive) || restMsValue === 0) {
        return;
      }

      if (
        !isOverInactive &&
        instance.restTimeoutPending &&
        event.movementX ** 2 + event.movementY ** 2 < 2
      ) {
        return;
      }

      instance.restTimeout.clear();

      function handleMouseMove() {
        instance.restTimeoutPending = false;

        // A delayed hover open should not override a click-like open that happened
        // while the hover delay was pending.
        if (isClickLikeOpenEvent()) {
          return;
        }

        const latestOpen = store.select('open');

        if (!instance.blockMouseMove && (!latestOpen || isOverInactive) && checkShouldOpen()) {
          store.setOpen(
            true,
            createChangeEventDetails(REASONS.triggerHover, event, trigger),
          );
        }
      }

      if (instance.pointerType === 'touch') {
        handleMouseMove();
      } else if (isOverInactive && currentOpen) {
        handleMouseMove();
      } else {
        instance.restTimeoutPending = true;
        instance.restTimeout.start(restMsValue, handleMouseMove);
      }
    },
  };
}

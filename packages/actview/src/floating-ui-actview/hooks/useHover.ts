import { onUnmounted, watch } from 'actview';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { mergeCleanups } from '@base-ui/actview-utils/mergeCleanups';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useOnMount } from '@base-ui/actview-utils/useOnMount';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { isElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { FloatingUIOpenChangeDetails } from '../../internals/types';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { Delay, ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { contains, getTarget, isInteractiveElement } from '../utils/element';
import type { HandleClose } from './useHoverShared';
import {
  getDelay,
  getRestMs,
  isClickLikeOpenEvent as isClickLikeOpenEventShared,
  isHoverOpenEvent,
} from './useHoverShared';

export type { HandleCloseContext, HandleClose } from './useHoverShared';

export interface UseHoverProps {
  /**
   * Accepts an event handler that runs on `mousemove` to control when the
   * floating element closes once the cursor leaves the reference element.
   * @default null
   */
  handleClose?: HandleClose | null | undefined;
  /**
   * Waits until the user's cursor is at “rest” over the reference element
   * before changing the `open` state.
   * @default 0
   */
  restMs?: number | (() => number) | undefined;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  delay?: Delay | (() => Delay) | undefined;
  /**
   * Whether moving the cursor over the floating element will open it, without a
   * regular hover event required.
   * @default true
   */
  move?: boolean | undefined;
}

/**
 * Opens the floating element while hovering over the reference element, like
 * CSS `:hover`.
 * @see https://floating-ui.com/docs/useHover
 */
export function useHover(
  context: FloatingRootContext | FloatingContext,
  props: UseHoverProps = {},
): ElementProps {
  const { delay = 0, handleClose = null, restMs = 0, move = true } = props;

  const store = 'rootStore' in context ? context.rootStore : context;

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const { dataRef, events } = store.context;

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();

  const handleCloseRef = useValueAsRef(handleClose);
  const delayRef = useValueAsRef(delay);
  const restMsRef = useValueAsRef(restMs);

  const pointerTypeRef = { current: undefined as string | undefined };
  const interactedInsideRef = { current: false };
  const handlerRef = { current: undefined as ((event: MouseEvent) => void) | undefined };
  const blockMouseMoveRef = { current: true };
  const performedPointerEventsMutationRef = { current: false };
  const unbindMouseMoveRef = { current: (() => {}) as () => void };
  const restTimeoutPendingRef = { current: false };

  const timeout = useTimeout();
  const restTimeout = useTimeout();

  const isHoverOpen = () => {
    return isHoverOpenEvent(dataRef.current.openEvent?.type);
  };

  const isClickLikeOpenEvent = () => {
    return isClickLikeOpenEventShared(dataRef.current.openEvent?.type, interactedInsideRef.current);
  };

  const cleanupMouseMoveHandler = () => {
    unbindMouseMoveRef.current();
    handlerRef.current = undefined;
  };

  const clearPointerEvents = () => {
    if (performedPointerEventsMutationRef.current) {
      const body = ownerDocument(floatingElement.value).body;
      body.style.pointerEvents = '';
      performedPointerEventsMutationRef.current = false;
    }
  };

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  useOnMount(() => {
    function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
      if (!details.open) {
        timeout.clear();
        restTimeout.clear();
        blockMouseMoveRef.current = true;
        restTimeoutPendingRef.current = false;
      }
    }

    events.on('openchange', onOpenChangeLocal);
    return () => {
      events.off('openchange', onOpenChangeLocal);
    };
  });

  watch(
    [open, floatingElement],
    ([openValue, floatingValue]) => {
      if (!handleCloseRef.current) {
        return;
      }

      if (!openValue) {
        return;
      }

      function onLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent()) {
          return;
        }

        if (isHoverOpen()) {
          store.setOpen(
            false,
            createChangeEventDetails(
              REASONS.triggerHover,
              event,
              (event.currentTarget as HTMLElement) ?? undefined,
            ),
          );
        }
      }

      const html = ownerDocument(floatingValue).documentElement;
      return addEventListener(html, 'mouseleave', onLeave);
    },
  );

  // Registering the mouse events on the reference directly to bypass React's
  // delegation system. If the cursor was on a disabled element and then entered
  // the reference (no gap), `mouseenter` doesn't fire in the delegation system.
  watch(
    [open, domReferenceElement, floatingElement],
    ([openValue, domReferenceValue, floatingValue], _old, onCleanup) => {
      function closeWithDelay(event: MouseEvent, runElseBranch = true) {
        const closeDelay = getDelay(delayRef.current, 'close', pointerTypeRef.current);
        if (closeDelay && !handlerRef.current) {
          timeout.start(closeDelay, () =>
            store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event)),
          );
        } else if (runElseBranch) {
          timeout.clear();
          store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
        }
      }

      function handleInteractInside(event: PointerEvent) {
        const target = getTarget(event) as Element | null;
        if (!isInteractiveElement(target)) {
          interactedInsideRef.current = false;
          return;
        }

        interactedInsideRef.current = true;
      }

      function getHandleCloseHandler(event: MouseEvent, onClose: () => void) {
        if (!handleCloseRef.current || !dataRef.current.floatingContext) {
          return null;
        }

        return handleCloseRef.current({
          ...dataRef.current.floatingContext,
          tree,
          x: event.clientX,
          y: event.clientY,
          placement: dataRef.current.floatingContext.placement.value,
          onClose,
        });
      }

      function onReferenceMouseEnter(event: MouseEvent) {
        timeout.clear();
        blockMouseMoveRef.current = false;

        if (getRestMs(restMsRef.current) > 0 && !getDelay(delayRef.current, 'open')) {
          return;
        }

        const openDelay = getDelay(delayRef.current, 'open', pointerTypeRef.current);
        const trigger = (event.currentTarget as HTMLElement) ?? undefined;

        const domReference = store.select('domReferenceElement');

        const isOverInactiveTrigger = domReference && trigger && !contains(domReference, trigger);

        if (openDelay) {
          timeout.start(openDelay, () => {
            if (!store.select('open')) {
              store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
            }
          });
        } else if (!openValue || isOverInactiveTrigger) {
          store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
        }
      }

      function onReferenceMouseLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent()) {
          clearPointerEvents();
          return;
        }

        unbindMouseMoveRef.current();

        const doc = ownerDocument(floatingValue);
        restTimeout.clear();
        restTimeoutPendingRef.current = false;

        const triggers = store.context.triggerElements;

        if (event.relatedTarget && triggers.hasElement(event.relatedTarget as Element)) {
          // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
          // as it will be moved.
          return;
        }

        const handler = getHandleCloseHandler(event, () => {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event, true);
          }
        });

        if (handler) {
          // Prevent clearing `onScrollMouseLeave` timeout.
          if (!openValue) {
            timeout.clear();
          }

          handlerRef.current = handler;
          unbindMouseMoveRef.current = addEventListener(doc, 'mousemove', handler);

          return;
        }

        // Allow interactivity without `safePolygon` on touch devices. With a
        // pointer, a short close delay is an alternative, so it should work
        // consistently.
        const shouldClose =
          pointerTypeRef.current === 'touch'
            ? !contains(floatingValue, event.relatedTarget as Element | null)
            : true;
        if (shouldClose) {
          closeWithDelay(event);
        }
      }

      // Ensure the floating element closes after scrolling even if the pointer
      // did not move.
      // https://github.com/floating-ui/floating-ui/discussions/1692
      function onScrollMouseLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent() || !dataRef.current.floatingContext || !store.select('open')) {
          return;
        }

        const triggers = store.context.triggerElements;

        if (event.relatedTarget && triggers.hasElement(event.relatedTarget as Element)) {
          // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
          // as it will be moved.
          return;
        }

        getHandleCloseHandler(event, () => {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event);
          }
        })?.(event);
      }

      function onFloatingMouseEnter() {
        timeout.clear();
        clearPointerEvents();
      }

      function onFloatingMouseLeave(event: MouseEvent) {
        if (!isClickLikeOpenEvent()) {
          closeWithDelay(event, false);
        }
      }

      const trigger = domReferenceValue as HTMLElement | null;

      if (isElement(trigger)) {
        const floating = floatingValue as HTMLElement | null;

        onCleanup(
          mergeCleanups(
            openValue && addEventListener(trigger, 'mouseleave', onScrollMouseLeave),
            move && addEventListener(trigger, 'mousemove', onReferenceMouseEnter, { once: true }),
            addEventListener(trigger, 'mouseenter', onReferenceMouseEnter),
            addEventListener(trigger, 'mouseleave', onReferenceMouseLeave),
            floating && addEventListener(floating, 'mouseleave', onScrollMouseLeave),
            floating && addEventListener(floating, 'mouseenter', onFloatingMouseEnter),
            floating && addEventListener(floating, 'mouseleave', onFloatingMouseLeave),
            floating && addEventListener(floating, 'pointerdown', handleInteractInside, true),
          ),
        );
      }
    },
  );

  // Block pointer-events of every element other than the reference and floating
  // while the floating element is open and has a `handleClose` handler. Also
  // handles nested floating elements.
  // https://github.com/floating-ui/floating-ui/issues/1722
  watch(
    [open, domReferenceElement, floatingElement],
    ([openValue, domReferenceValue, floatingValue], _old, onCleanup) => {
      // eslint-disable-next-line no-underscore-dangle
      if (openValue && handleCloseRef.current?.__options?.blockPointerEvents && isHoverOpen()) {
        performedPointerEventsMutationRef.current = true;
        const floatingEl = floatingValue;

        if (isElement(domReferenceValue) && floatingEl) {
          const body = ownerDocument(floatingValue).body;

          const ref = domReferenceValue as HTMLElement | SVGSVGElement;

          const parentFloating = tree?.nodesRef.current.find((node) => node.id === parentId)
            ?.context?.elements.floating;

          if (parentFloating) {
            parentFloating.style.pointerEvents = '';
          }

          body.style.pointerEvents = 'none';
          ref.style.pointerEvents = 'auto';
          floatingEl.style.pointerEvents = 'auto';

          onCleanup(() => {
            body.style.pointerEvents = '';
            ref.style.pointerEvents = '';
            floatingEl.style.pointerEvents = '';
          });
        }
      }
    },
  );

  watch([open], ([openValue]) => {
    if (!openValue) {
      pointerTypeRef.current = undefined;
      restTimeoutPendingRef.current = false;
      interactedInsideRef.current = false;
      cleanupMouseMoveHandler();
      clearPointerEvents();
    }
  });

  onUnmounted(() => {
    cleanupMouseMoveHandler();
    timeout.clear();
    restTimeout.clear();
    interactedInsideRef.current = false;
  });

  onUnmounted(clearPointerEvents);

  function setPointerRef(event: PointerEvent) {
    pointerTypeRef.current = event.pointerType;
  }

  const reference: ElementProps['reference'] = {
    onPointerDown: setPointerRef,
    onPointerEnter: setPointerRef,
    onMouseMove(event) {
      const nativeEvent = event;
      const trigger = event.currentTarget as HTMLElement;

      // `true` when there are multiple triggers per floating element and user hovers over the one that
      // wasn't used to open the floating element.
      const isOverInactiveTrigger =
        store.select('domReferenceElement') &&
        !contains(store.select('domReferenceElement'), event.target as Element);

      function handleMouseMove() {
        if (!blockMouseMoveRef.current && (!store.select('open') || isOverInactiveTrigger)) {
          store.setOpen(
            true,
            createChangeEventDetails(REASONS.triggerHover, nativeEvent, trigger),
          );
        }
      }

      if (
        (store.select('open') && !isOverInactiveTrigger) ||
        getRestMs(restMsRef.current) === 0
      ) {
        return;
      }

      // Ignore insignificant movements to account for tremors.
      if (
        !isOverInactiveTrigger &&
        restTimeoutPendingRef.current &&
        event.movementX ** 2 + event.movementY ** 2 < 2
      ) {
        return;
      }

      restTimeout.clear();

      if (pointerTypeRef.current === 'touch') {
        handleMouseMove();
      } else if (isOverInactiveTrigger) {
        handleMouseMove();
      } else {
        restTimeoutPendingRef.current = true;
        restTimeout.start(getRestMs(restMsRef.current), handleMouseMove);
      }
    },
  };

  return { reference };
}

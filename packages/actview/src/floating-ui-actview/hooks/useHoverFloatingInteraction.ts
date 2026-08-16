import { onUnmounted, watch } from 'actview';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { mergeCleanups } from '@base-ui/actview-utils/mergeCleanups';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { isElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { FloatingContext, FloatingRootContext } from '../types';
import { contains, getTarget } from '../utils/element';
import { getNodeChildren } from '../utils/nodes';
import {
  applySafePolygonPointerEventsMutation,
  clearSafePolygonPointerEventsMutation,
  isInteractiveElement,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';
import {
  getDelay,
  isClickLikeOpenEvent as isClickLikeOpenEventShared,
  isHoverOpenEvent,
  isInsideEnabledTrigger,
} from './useHoverShared';

export type UseHoverFloatingInteractionProps = {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  closeDelay?: number | (() => number) | undefined;
  /**
   * Tree node id override for floating elements that participate in the tree
   * without a `FloatingContext`, such as inline nested navigation menus.
   */
  nodeId?: string | undefined;
};

/**
 * Provides hover interactions that should be attached to the floating element.
 */
export function useHoverFloatingInteraction(
  context: FloatingRootContext | FloatingContext,
  parameters: UseHoverFloatingInteractionProps = {},
): void {
  const { enabled = true, closeDelay: closeDelayProp = 0, nodeId: nodeIdProp } = parameters;

  const store = 'rootStore' in context ? context.rootStore : context;

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const { dataRef } = store.context;

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();
  const instance = useHoverInteractionSharedState(store);

  const childClosedTimeout = useTimeout();

  const isClickLikeOpenEvent = () => {
    return isClickLikeOpenEventShared(dataRef.current.openEvent?.type, instance.interactedInside);
  };

  const isHoverOpen = () => {
    return isHoverOpenEvent(dataRef.current.openEvent?.type);
  };

  const clearPointerEvents = () => {
    clearSafePolygonPointerEventsMutation(instance);
  };

  watch([open], ([openValue]) => {
    if (!openValue) {
      instance.pointerType = undefined;
      instance.restTimeoutPending = false;
      instance.interactedInside = false;
      clearPointerEvents();
    }
  });

  onUnmounted(clearPointerEvents);

  watch(
    [open, domReferenceElement, floatingElement],
    ([openValue, domReferenceValue, floatingValue], _old, onCleanup) => {
      if (!enabled) {
        return;
      }

      if (
        openValue &&
        instance.handleCloseOptions?.blockPointerEvents &&
        isHoverOpen() &&
        isElement(domReferenceValue) &&
        floatingValue
      ) {
        const ref = domReferenceValue as HTMLElement | SVGSVGElement;
        const floatingEl = floatingValue;
        const doc = ownerDocument(floatingValue);

        const parentFloating = tree?.nodesRef.current.find((node) => node.id === parentId)
          ?.context?.elements.floating as HTMLElement | null;

        if (parentFloating) {
          parentFloating.style.pointerEvents = '';
        }

        // A keep-mounted submenu can appear in the tree before it opens, so a
        // cached scope or parent lookup may resolve to the submenu itself. That
        // would not shield sibling items in the parent menu.
        const cachedScopeElement =
          instance.pointerEventsScopeElement !== floatingEl
            ? instance.pointerEventsScopeElement
            : null;
        const parentScopeElement = parentFloating !== floatingEl ? parentFloating : null;
        const scopeElement =
          instance.handleCloseOptions?.getScope?.() ??
          cachedScopeElement ??
          parentScopeElement ??
          (ref.closest('[data-rootownerid]') as HTMLElement | SVGSVGElement | null) ??
          doc.body;

        applySafePolygonPointerEventsMutation(instance, {
          scopeElement,
          referenceElement: ref,
          floatingElement: floatingEl,
        });

        onCleanup(() => {
          clearPointerEvents();
        });
      }
    },
  );

  watch([floatingElement], ([floatingValue], _old, onCleanup) => {
    if (!enabled) {
      return;
    }

    function hasParentChildren() {
      return !!(tree && parentId && getNodeChildren(tree.nodesRef.current, parentId).length > 0);
    }

    function closeWithDelay(event: MouseEvent) {
      const closeDelay = getDelay(closeDelayProp, 'close', instance.pointerType);
      const close = () => {
        store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
        tree?.events.emit('floating.closed', event);
      };

      if (closeDelay) {
        instance.openChangeTimeout.start(closeDelay, close);
      } else {
        instance.openChangeTimeout.clear();
        close();
      }
    }

    function handleInteractInside(event: PointerEvent) {
      const target = getTarget(event) as Element | null;
      if (!isInteractiveElement(target)) {
        instance.interactedInside = false;
        return;
      }

      instance.interactedInside = target?.closest('[aria-haspopup]') != null;
    }

    function onFloatingMouseEnter() {
      instance.openChangeTimeout.clear();
      childClosedTimeout.clear();
      tree?.events.off('floating.closed', onNodeClosed);
      clearPointerEvents();
    }

    function onFloatingMouseLeave(event: MouseEvent) {
      if (hasParentChildren() && tree) {
        tree.events.on('floating.closed', onNodeClosed);
        return;
      }

      if (isInsideEnabledTrigger(event.relatedTarget, store.context.triggerElements)) {
        // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
        // as it will be moved.
        return;
      }

      const currentNodeId = dataRef.current.floatingContext?.nodeId ?? nodeIdProp;
      const relatedTarget = event.relatedTarget;
      const isMovingIntoDescendantFloating =
        tree &&
        currentNodeId &&
        isElement(relatedTarget) &&
        getNodeChildren(tree.nodesRef.current, currentNodeId, false).some((node) =>
          contains(node.context?.elements.floating, relatedTarget),
        );

      if (isMovingIntoDescendantFloating) {
        return;
      }

      // If the safePolygon handler is active, let it handle the close logic.
      if (instance.handler) {
        instance.handler(event);
        return;
      }

      clearPointerEvents();
      if (isHoverOpen() && !isClickLikeOpenEvent()) {
        closeWithDelay(event);
      }
    }

    function onNodeClosed(event: MouseEvent) {
      if (!tree || !parentId || hasParentChildren()) {
        return;
      }
      // Allow the mouseenter event to fire in case child was closed because mouse moved into parent.
      childClosedTimeout.start(0, () => {
        tree.events.off('floating.closed', onNodeClosed);
        store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
        tree.events.emit('floating.closed', event);
      });
    }

    const floating = floatingValue as HTMLElement | null;
    onCleanup(
      mergeCleanups(
        floating && addEventListener(floating, 'mouseenter', onFloatingMouseEnter),
        floating && addEventListener(floating, 'mouseleave', onFloatingMouseLeave),
        floating && addEventListener(floating, 'pointerdown', handleInteractInside, true),
        () => {
          tree?.events.off('floating.closed', onNodeClosed);
        },
      ),
    );
  });
}

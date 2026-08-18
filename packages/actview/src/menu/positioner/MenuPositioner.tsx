import { computed, watch } from 'actview';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { FloatingNode } from '../../floating-ui-actview';
import { MenuPositionerContext } from './MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import {
  useAnchorPositioning,
  type Align,
  type Side,
  type UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { useMenuPortalContext } from '../portal/MenuPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE, POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { MenuOpenEventDetails } from '../utils/types';
import { useAnimationsFinished } from '../../internals/useAnimationsFinished';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

/**
 * Positions the menu popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPositioner(componentProps: MenuPositioner.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    anchor: anchorProp,
    positionMethod: positionMethodProp = 'absolute',
    side,
    align: alignProp,
    sideOffset: sideOffsetProp = 0,
    alignOffset: alignOffsetProp = 0,
    collisionBoundary = 'clipping-ancestors',
    collisionPadding = 5,
    arrowPadding = 5,
    sticky = false,
    disableAnchorTracking = false,
    collisionAvoidance: collisionAvoidanceProp = DROPDOWN_COLLISION_AVOIDANCE,
    ...elementProps
  } = componentProps;

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;

  const keepMounted = useMenuPortalContext().value ?? false;
  const contextMenuContext = useContextMenuRootContext(true);

  const parent = store.useState('parent');
  const floatingRootContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const triggerElement = store.useState('activeTriggerElement');
  const transitionStatus = store.useState('transitionStatus');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const adaptiveOrigin = store.useState('adaptiveOrigin');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const floatingNodeId = store.useState('floatingNodeId');
  const floatingParentNodeId = store.useState('floatingParentNodeId');
  const domReference = floatingRootContext.value.useState('domReferenceElement');

  const previousTriggerRef = { current: null as Element | null };
  const runOnceAnimationsFinish = useAnimationsFinished(positionerElement);

  let anchor = anchorProp;
  let sideOffset = sideOffsetProp;
  let alignOffset = alignOffsetProp;
  let align = alignProp;
  let collisionAvoidance = collisionAvoidanceProp;
  if (parent.value.type === 'context-menu') {
    anchor = anchorProp ?? parent.value.context?.anchor;
    align = align ?? 'start';
    if (!side && align !== 'center') {
      alignOffset = componentProps.alignOffset ?? 2;
      sideOffset = componentProps.sideOffset ?? -5;
    }
  }

  let computedSide = side;
  let computedAlign = align;
  if (parent.value.type === 'menu') {
    computedSide = computedSide ?? 'inline-end';
    computedAlign = computedAlign ?? 'start';
    collisionAvoidance = componentProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;
  } else if (parent.value.type === 'menubar') {
    computedSide =
      computedSide ?? (parent.value.context.orientation === 'vertical' ? 'inline-end' : 'bottom');
    computedAlign = computedAlign ?? 'start';
  }

  const contextMenu = parent.value.type === 'context-menu';

  const positioning = useAnchorPositioning({
    anchor,
    positionMethod: contextMenuContext.value ? 'fixed' : positionMethodProp,
    mounted,
    side: computedSide,
    sideOffset,
    align: computedAlign,
    alignOffset,
    arrowPadding: contextMenu ? 0 : arrowPadding,
    collisionBoundary,
    collisionPadding,
    sticky,
    keepMounted,
    disableAnchorTracking,
    collisionAvoidance,
    shift: contextMenu
      ? {
          crossAxis: !('side' in collisionAvoidance && collisionAvoidance.side === 'flip'),
          rootBoundary: 'layoutViewport',
        }
      : undefined,
    adaptiveOrigin: adaptiveOrigin.value,
  });

  watch(
    [open, floatingNodeId, floatingParentNodeId],
    () => {
      const eventDetails: MenuOpenEventDetails = {
        open: open.value,
        nodeId: floatingNodeId.value,
        parentNodeId: floatingParentNodeId.value,
        reason: store.select('lastOpenChangeReason'),
      };

      floatingTreeRoot.value.events.emit('menuopenchange', eventDetails);
    },
    { immediate: true },
  );

  watch(
    () => floatingTreeRoot.value,
    () => {
      if (store.select('floatingParentNodeId') == null) {
        return;
      }

      function onParentClose(details: MenuOpenEventDetails) {
        if (details.open || details.nodeId !== store.select('floatingParentNodeId')) {
          return;
        }

        const reason: MenuRoot.ChangeEventReason = details.reason ?? REASONS.siblingOpen;
        store.setOpen(false, createChangeEventDetails(reason));
      }

      floatingTreeRoot.value.events.on('menuopenchange', onParentClose);

      return () => {
        floatingTreeRoot.value.events.off('menuopenchange', onParentClose);
      };
    },
    { immediate: true },
  );

  watch(
    [() => floatingTreeRoot.value, () => floatingNodeId.value],
    () => {
      function onMenuOpenChange(details: MenuOpenEventDetails) {
        if (details.open) {
          if (details.parentNodeId === floatingNodeId.value) {
            store.set('hoverEnabled', false);
          }
          if (
            details.nodeId !== floatingNodeId.value &&
            details.parentNodeId === store.select('floatingParentNodeId')
          ) {
            store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
          }
        }
      }

      floatingTreeRoot.value.events.on('menuopenchange', onMenuOpenChange);

      return () => {
        floatingTreeRoot.value.events.off('menuopenchange', onMenuOpenChange);
      };
    },
    { immediate: true },
  );

  const closeTimeout = useTimeout();

  // Clear pending close timeout when the menu closes.
  watch(
    open,
    (isOpen) => {
      if (!isOpen) {
        closeTimeout.clear();
      }
    },
    { immediate: true },
  );

  // Close unrelated child submenus when hovering a different item in the parent menu.
  watch(
    [() => floatingTreeRoot.value, open, triggerElement, () => store.select('closeDelay')],
    () => {
      function onItemHover(event: { nodeId: string | undefined; target: Element | null }) {
        // If an item within our parent menu is hovered, and this menu's trigger is not that item,
        // close this submenu. This ensures hovering a different item in the parent closes other branches.
        if (!open.value || event.nodeId !== store.select('floatingParentNodeId')) {
          return;
        }

        if (event.target && triggerElement.value && triggerElement.value !== event.target) {
          const delay = store.select('closeDelay');
          if (delay > 0) {
            if (!closeTimeout.isStarted()) {
              closeTimeout.start(delay, () => {
                store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
              });
            }
          } else {
            store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
          }
        } else {
          // User re-hovered the submenu trigger, cancel pending close.
          closeTimeout.clear();
        }
      }

      floatingTreeRoot.value.events.on('itemhover', onItemHover);
      return () => {
        floatingTreeRoot.value.events.off('itemhover', onItemHover);
      };
    },
    { immediate: true },
  );

  // Keep positioner transition behavior aligned with Popover when switching detached triggers.
  watch(
    domReference,
    (currentTrigger) => {
      const previousTrigger = previousTriggerRef.current;

      if (currentTrigger) {
        previousTriggerRef.current = currentTrigger;
      }

      if (previousTrigger && currentTrigger && currentTrigger !== previousTrigger) {
        store.set('instantType', undefined);

        const abortController = new AbortController();
        runOnceAnimationsFinish(() => {
          store.set('instantType', 'trigger-change');
        }, abortController.signal);

        return () => {
          abortController.abort();
        };
      }

      return undefined;
    },
    { immediate: true },
  );

  const state = computed<MenuPositionerState>(() => ({
    open: open.value,
    side: positioning.side.value,
    align: positioning.align.value,
    anchorHidden: positioning.anchorHidden.value,
    nested: parent.value.type === 'menu',
    instant: instantType.value,
  }));

  const menubarModal = parent.value.type === 'menubar' && parent.value.context.modal;
  const popupModal = modal.value && lastOpenChangeReason.value !== REASONS.triggerHover;

  useAnchoredPopupScrollLock(
    computed(() => open.value && (menubarModal || popupModal)),
    computed(() => openMethod.value === 'touch'),
    positionerElement,
    triggerElement,
  );

  const setPositionerElement = store.useStateSetter('positionerElement');

  const getElement = usePositioner(componentProps, state, {
    styles: positioning.positionerStyles as unknown as Record<string, string | number>,
    transitionStatus,
    props: elementProps,
    refs: [componentProps.ref, setPositionerElement],
    hidden: computed(() => !mounted.value),
    inert: computed(() => !open.value),
  });

  const shouldRenderBackdrop = computed(
    () =>
      mounted.value &&
      parent.value.type !== 'menu' &&
      ((parent.value.type !== 'menubar' &&
        modal.value &&
        lastOpenChangeReason.value !== REASONS.triggerHover) ||
        (parent.value.type === 'menubar' && parent.value.context.modal)),
  );

  // cuts a hole in the backdrop to allow pointer interaction with the menubar or dropdown menu trigger element
  let backdropCutout: HTMLElement | null = null;
  if (parent.value.type === 'menubar') {
    backdropCutout = parent.value.context.contentElement;
  } else if (parent.value.type === undefined) {
    backdropCutout = triggerElement.value as HTMLElement | null;
  }

  const contextValue = computed<MenuPositionerContext>(() => ({
    side: positioning.side,
    align: positioning.align,
    arrowRef: positioning.arrowRef,
    arrowUncentered: positioning.arrowUncentered,
    arrowStyles: positioning.arrowStyles,
    context: { nodeId: floatingNodeId.value },
  }));

  return (
    <MenuPositionerContext.Provider value={contextValue}>
      {shouldRenderBackdrop.value && (
        <InternalBackdrop
          ref={
            parent.value.type === 'context-menu' || parent.value.type === 'nested-context-menu'
              ? parent.value.context.internalBackdropRef
              : null
          }
          inert={inertValue(!open.value)}
          cutout={backdropCutout}
        />
      )}
      <FloatingNode id={floatingNodeId.value}>
        <CompositeList
          elementsRef={store.context.itemDomElements}
          labelsRef={store.context.itemLabels}
        >
          {getElement()}
        </CompositeList>
      </FloatingNode>
    </MenuPositionerContext.Provider>
  );
}

export interface MenuPositionerState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * Whether CSS transitions should be disabled.
   */
  instant: string | undefined;
}

export interface MenuPositionerProps
  extends UseAnchorPositioningSharedParameters, BaseUIComponentProps<'div', MenuPositionerState> {}

export namespace MenuPositioner {
  export type State = MenuPositionerState;
  export type Props = MenuPositionerProps;
}

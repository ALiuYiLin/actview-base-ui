import {rawRef, computed, watch, ref} from 'actview';
import type { ComputedRef } from 'actview';
import { inertValue } from '@/utils/inertValue';
import { FloatingNode } from '@/floating-ui-react';
import { MenuPositionerContext } from './MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import {
  useAnchorPositioning,
  type Align,
  type Side,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import { CompositeList } from '@/internals/composite/list/CompositeList';
import { InternalBackdrop } from '@/utils/InternalBackdrop';
import { useMenuPortalContext } from '../portal/MenuPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE, POPUP_COLLISION_AVOIDANCE } from '@/internals/constants';
import { useContextMenuRootContext } from '@/context-menu/root/ContextMenuRootContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { useTimeout } from '@/utils/useTimeout';
import { usePositioner } from '@/utils/usePositioner';
import { useAnchoredPopupScrollLock } from '@/utils/useAnchoredPopupScrollLock';

/**
 * Positions the menu popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPositioner(componentProps: MenuPositioner.Props) {
  // ============ setup（只执行一次） ============
  const {
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
  } = componentProps;

  const {store} = useMenuRootContext();

  const keepMounted = useMenuPortalContext();
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
  const domReference = (floatingRootContext.value as any)?.useState('domReferenceElement');

  const previousTriggerRef = ref(null as Element | null);
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

  const positioner = useAnchorPositioning({
    anchor,
    floatingRootContext: floatingRootContext.value,
    positionMethod: contextMenuContext ? 'fixed' : positionMethodProp,
    mounted,
    side: computedSide,
    sideOffset,
    align: computedAlign,
    alignOffset,
    arrowPadding: contextMenu ? 0 : arrowPadding,
    collisionBoundary,
    collisionPadding,
    sticky,
    nodeId: floatingNodeId.value,
    keepMounted,
    disableAnchorTracking,
    collisionAvoidance,
    shift: contextMenu
      ? {
          crossAxis: !('side' in collisionAvoidance && collisionAvoidance.side === 'flip'),
          rootBoundary: 'layoutViewport',
        }
      : undefined,
    externalTree: floatingTreeRoot.value,
    adaptiveOrigin: adaptiveOrigin.value as any,
  });

  // menuopenchange 事件处理
  watch(
    () => [store, floatingTreeRoot.value, floatingNodeId.value] as const,
    () => {
      const events = floatingTreeRoot.value.events;
      if (!events) {
        return undefined;
      }

      function onMenuOpenChange(details: any) {
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

      events.on('menuopenchange', onMenuOpenChange);

      return () => {
        events.off('menuopenchange', onMenuOpenChange);
      };
    },
    {flush: 'post', immediate: true},
  );

  // 对齐 react：open/floatingNodeId/floatingParentNodeId 变化时广播
  // menuopenchange 事件（含受控 open 变化），子菜单按父关闭传播关闭。
  watch(
    () => [open.value, floatingNodeId.value, floatingParentNodeId.value] as const,
    () => {
      const events = floatingTreeRoot.value?.events;
      if (!events) {
        return;
      }
      events.emit('menuopenchange', {
        open: open.value,
        nodeId: floatingNodeId.value,
        parentNodeId: floatingParentNodeId.value,
        reason: lastOpenChangeReason.value,
      });
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [store, floatingTreeRoot.value] as const,
    () => {
      if (store.select('floatingParentNodeId') == null) {
        return undefined;
      }

      const events = floatingTreeRoot.value.events;
      if (!events) {
        return undefined;
      }

      function onParentClose(details: any) {
        if (details.open || details.nodeId !== store.select('floatingParentNodeId')) {
          return;
        }

        const reason: MenuRoot.ChangeEventReason = details.reason ?? REASONS.siblingOpen;
        store.setOpen(false, createChangeEventDetails(reason));
      }

      events.on('menuopenchange', onParentClose);

      return () => {
        events.off('menuopenchange', onParentClose);
      };
    },
    {flush: 'post', immediate: true},
  );

  const closeTimeout = useTimeout();

  // Clear pending close timeout when the menu closes.
  watch(
    () => open.value,
    () => {
      if (!open.value) {
        closeTimeout.clear();
      }
    },
    {flush: 'post', immediate: true},
  );

  // Close unrelated child submenus when hovering a different item in the parent menu.
  watch(
    () => [floatingTreeRoot.value, open.value, triggerElement.value, store] as const,
    () => {
      const events = floatingTreeRoot.value.events;
      if (!events) {
        return undefined;
      }

      function onItemHover(event: {nodeId: string | undefined; target: Element | null}) {
        // If an item within our parent menu is hovered, and this menu's trigger is not that item,
        // close this submenu.
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

      events.on('itemhover', onItemHover);
      return () => {
        events.off('itemhover', onItemHover);
      };
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [floatingTreeRoot.value, open.value, store, floatingNodeId.value, floatingParentNodeId.value] as const,
    () => {
      const eventDetails = {
        open: open.value,
        nodeId: floatingNodeId.value,
        parentNodeId: floatingParentNodeId.value,
        reason: store.select('lastOpenChangeReason'),
      };

      floatingTreeRoot.value.events?.emit('menuopenchange', eventDetails);
    },
    {flush: 'post', immediate: true},
  );

  // Keep positioner transition behavior aligned with Popover when switching detached triggers.
  watch(
    () => [domReference.value] as const,
    () => {
      const currentTrigger = domReference.value;
      const previousTrigger = previousTriggerRef.value;

      if (currentTrigger) {
        previousTriggerRef.value = currentTrigger;
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
    {flush: 'post', immediate: true},
  );

  const state = computed<MenuPositionerState>(() => ({
    open: open.value,
    side: positioner.side.value,
    align: positioner.align.value,
    anchorHidden: positioner.anchorHidden.value,
    nested: parent.value.type === 'menu',
    instant: instantType.value as any,
  }));

  const menubarModal = () => parent.value.type === 'menubar' && parent.value.context.modal;
  const popupModal = () => modal.value && lastOpenChangeReason.value !== REASONS.triggerHover;

  // reactive inputs（一次性 setup 下快照布尔会让锁失效）
  useAnchoredPopupScrollLock(
    computed(() => open.value && (menubarModal() || popupModal())),
    computed(() => openMethod.value === 'touch'),
    positionerElement,
    triggerElement as any,
  );

  const element = usePositioner(componentProps as any, state as any, {
    styles: positioner.positionerStyles,
    transitionStatus,
    props: {} as any,
    refs: [
      store.useStateSetter('positionerElement'),
      (el: HTMLElement | null) => {
        if (contextMenuContext) {
          contextMenuContext.positionerRef.value = el;
        }
      },
    ],
    // 传 getter（渲染期 toValue 求值）：keepMounted 时 setup 快照会过时
    hidden: () => !mounted.value,
    inert: () => !open.value,
  }) as any;

  const shouldRenderBackdrop = () =>
    mounted.value &&
    parent.value.type !== 'menu' &&
    ((parent.value.type !== 'menubar' &&
      modal.value &&
      lastOpenChangeReason.value !== REASONS.triggerHover) ||
      (parent.value.type === 'menubar' && parent.value.context.modal));

  // cuts a hole in the backdrop to allow pointer interaction with the menubar or dropdown menu trigger element
  const backdropCutout = computed(() => {
    if (parent.value.type === 'menubar') {
      return parent.value.context.contentElement;
    } else if (parent.value.type === undefined) {
      return triggerElement.value as HTMLElement | null;
    }
    return null;
  });

  // store-as-is 载体：身份稳定的 getter 对象——side/align/anchorHidden/
  // arrowUncentered/arrowStyles 渲染期求值（useAnchorPositioning 返回
  // computed）；arrowRef 为稳定 ref。
  const contextValue = {
    get nodeId() {
      return floatingNodeId.value;
    },
    get side() {
      return positioner.side.value;
    },
    get align() {
      return positioner.align.value;
    },
    arrowRef: positioner.arrowRef,
    get arrowUncentered() {
      return positioner.arrowUncentered.value;
    },
    get arrowStyles() {
      return positioner.arrowStyles.value;
    },
    get context() {
      return {nodeId: floatingNodeId.value};
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuPositionerContext.Provider value={contextValue as any}>
      {shouldRenderBackdrop() && (
        <InternalBackdrop
          ref={
            parent.value.type === 'context-menu' || parent.value.type === 'nested-context-menu'
              ? parent.value.context.internalBackdropRef
              : null
          }
          inert={inertValue(!open.value)}
          cutout={backdropCutout.value}
        />
      )}
      <FloatingNode id={floatingNodeId.value}>
        <CompositeList
          elementsRef={rawRef(store.context.itemDomElements)}
          labelsRef={rawRef(store.context.itemLabels)}
        >
          {element()}
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
  extends UseAnchorPositioningSharedParameters {
  children?: any;
  [key: string]: any;
}

export namespace MenuPositioner {
  export type State = MenuPositionerState;
  export type Props = MenuPositionerProps;
}

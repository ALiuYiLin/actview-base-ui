import { computed, watch } from 'actview';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import { FloatingNode, useFloatingNodeId } from '../../floating-ui-actview';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPositionerContext } from './PopoverPositionerContext';
import {
  useAnchorPositioning,
  type Side,
  type Align,
  type UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { usePopoverPortalContext } from '../portal/PopoverPortalContext';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { REASONS } from '../../internals/reasons';
import { POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { useAnimationsFinished } from '../../internals/useAnimationsFinished';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

/**
 * Positions the popover against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPositioner(componentProps: PopoverPositioner.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    anchor,
    // `useAnchorPositioning` applies the same defaults to the undefined values; the names
    // remain destructured to exclude the props from `elementProps`.
    positionMethod,
    side,
    align,
    sideOffset,
    alignOffset,
    collisionBoundary = 'clipping-ancestors',
    collisionPadding,
    arrowPadding,
    sticky,
    disableAnchorTracking = false,
    collisionAvoidance = POPUP_COLLISION_AVOIDANCE,
    ...elementProps
  } = componentProps;

  const store = usePopoverRootContext().value!;
  const keepMounted = usePopoverPortalContext();
  const nodeId = useFloatingNodeId();

  const floatingRootContext = store.useState('floatingRootContext');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openReason = store.useState('openChangeReason');
  const triggerElement = store.useState('activeTriggerElement');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');

  const prevTriggerElementRef = { current: null as Element | null };

  const runOnceAnimationsFinish = useAnimationsFinished(positionerElement);

  const positioning = useAnchorPositioning({
    anchor,
    positionMethod,
    mounted,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    collisionBoundary,
    collisionPadding,
    sticky,
    disableAnchorTracking,
    keepMounted: keepMounted.value,
    collisionAvoidance,
    adaptiveOrigin: adaptiveOrigin.value,
  });

  const domReference = floatingRootContext.value.useState('domReferenceElement');

  // When the current trigger element changes, enable transitions on the
  // positioner temporarily.
  watch(domReference, (currentTriggerElement, _old, onCleanup) => {
    const prevTriggerElement = prevTriggerElementRef.current;

    if (currentTriggerElement) {
      prevTriggerElementRef.current = currentTriggerElement;
    }

    if (
      prevTriggerElement &&
      currentTriggerElement &&
      currentTriggerElement !== prevTriggerElement
    ) {
      store.set('instantType', undefined);
      const ac = new AbortController();
      runOnceAnimationsFinish(() => {
        store.set('instantType', 'trigger-change');
      }, ac.signal);

      onCleanup(() => {
        ac.abort();
      });
    }

    return undefined;
  });

  const trueModalNonHover = computed(() => modal.value === true && openReason.value !== REASONS.triggerHover);

  useAnchoredPopupScrollLock(
    computed(() => open.value && trueModalNonHover.value),
    computed(() => openMethod.value === 'touch'),
    positionerElement,
    triggerElement,
  );

  const setPositionerElement = store.useStateSetter('positionerElement');

  const state = computed<PopoverPositionerState>(() => ({
    open: open.value,
    side: positioning.side.value,
    align: positioning.align.value,
    anchorHidden: positioning.anchorHidden.value,
    instant: instantType.value,
  }));

  const contextValue = computed<PopoverPositionerContext>(() => ({
    side: positioning.side.value,
    align: positioning.align.value,
    arrowRef: positioning.arrowRef,
    arrowUncentered: positioning.arrowUncentered.value,
    arrowStyles: positioning.arrowStyles.value,
  }));

  const element = usePositioner(componentProps, state, {
    styles: positioning.positionerStyles as unknown as Parameters<
      typeof usePositioner
    >[2]['styles'],
    transitionStatus,
    props: elementProps,
    refs: [componentProps.ref, setPositionerElement],
    hidden: computed(() => !mounted.value),
    inert: computed(() => !open.value),
  });

  return (
    <PopoverPositionerContext.Provider value={contextValue}>
      {mounted.value && trueModalNonHover.value && (
        <InternalBackdrop inert={inertValue(!open.value)} cutout={triggerElement.value} />
      )}
      <FloatingNode id={nodeId}>{element()}</FloatingNode>
    </PopoverPositionerContext.Provider>
  );
}

export interface PopoverPositionerState {
  /**
   * Whether the popover is currently open.
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
   * Whether CSS transitions should be disabled.
   */
  instant: string | undefined;
}

export interface PopoverPositionerProps
  extends UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', PopoverPositionerState> {}

export namespace PopoverPositioner {
  export type State = PopoverPositionerState;
  export type Props = PopoverPositionerProps;
}

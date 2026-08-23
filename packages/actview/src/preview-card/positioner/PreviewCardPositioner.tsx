import { defineComponent, toValue, watch } from 'actview';
import { inertValue } from '@/utils/inertValue';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import { PreviewCardPositionerContext } from './PreviewCardPositionerContext';
import {
  useAnchorPositioning,
  type Side,
  type Align,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { usePreviewCardPortalContext } from '../portal/PreviewCardPortalContext';
import { InternalBackdrop } from '@/utils/InternalBackdrop';
import { REASONS } from '@/internals/reasons';
import { POPUP_COLLISION_AVOIDANCE } from '@/internals/constants';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { usePositioner } from '@/utils/usePositioner';
import { useAnchoredPopupScrollLock } from '@/utils/useAnchoredPopupScrollLock';

/**
 * Positions the preview-card against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export const PreviewCardPositioner = defineComponent(function PreviewCardPositioner(
  componentProps: PreviewCardPositioner.Props,
) {
  const {
    anchor,
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
  } = componentProps as any;

  const store = usePreviewCardRootContext(false);
  const keepMounted = usePreviewCardPortalContext();

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
  const domReference = (floatingRootContext.value as any)?.useState('domReferenceElement');

  const previousTriggerRef = {current: null as Element | null};
  const runOnceAnimationsFinish = useAnimationsFinished(positionerElement);

  const positioner = useAnchorPositioning({
    anchor,
    floatingRootContext: floatingRootContext.value,
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
    keepMounted,
    collisionAvoidance,
    adaptiveOrigin: adaptiveOrigin.value as any,
  });

  // When the current trigger element changes, enable transitions on the
  // positioner temporarily.
  watch(
    () => domReference?.value,
    (current: Element | null | undefined) => {
      const prevTriggerElement = previousTriggerRef.current;

      if (current) {
        previousTriggerRef.current = current;
      }

      if (prevTriggerElement && current && current !== prevTriggerElement) {
        store.set('instantType', undefined);
        const ac = new AbortController();
        runOnceAnimationsFinish(() => {
          store.set('instantType', 'trigger-change');
        }, ac.signal);

        return () => {
          ac.abort();
        };
      }

      return undefined;
    },
    {flush: 'post', immediate: true},
  );

  const trueModalNonHover = () => modal.value === true && openReason.value !== REASONS.triggerHover;

  useAnchoredPopupScrollLock(
    open.value && trueModalNonHover(),
    openMethod.value === 'touch',
    positionerElement.value,
    triggerElement.value as HTMLElement | null,
  );

  const state: PreviewCardPositionerState = {
    open: open.value,
    side: positioner.side,
    align: positioner.align,
    anchorHidden: positioner.anchorHidden,
    instant: instantType.value as any,
    transitionStatus: transitionStatus.value as any,
  };

  const element = usePositioner(componentProps as any, state as any, {
    styles: positioner.positionerStyles,
    transitionStatus,
    props: elementProps,
    refs: [store.useStateSetter('positionerElement')],
    hidden: () => !mounted.value,
    inert: () => !open.value,
  }) as any;

  return () => (
    <PreviewCardPositionerContext.Provider value={positioner as any}>
      {mounted.value && trueModalNonHover() && (
        <InternalBackdrop inert={inertValue(!open.value)} cutout={triggerElement.value} />
      )}
      {element()}
    </PreviewCardPositionerContext.Provider>
  );
});

export interface PreviewCardPositionerState {
  /**
   * Whether the preview-card is currently open.
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
  /**
   * The transition status of the component.
   */
  transitionStatus: any;
}

export interface PreviewCardPositionerProps
  extends UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', PreviewCardPositionerState> {
  children?: any;
  [key: string]: any;
}

export namespace PreviewCardPositioner {
  export type State = PreviewCardPositionerState;
  export type Props = PreviewCardPositionerProps;
}

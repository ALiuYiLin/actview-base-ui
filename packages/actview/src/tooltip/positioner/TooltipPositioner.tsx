import {watch, ref} from 'actview';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPositionerContext } from './TooltipPositionerContext';
import {
  useAnchorPositioning,
  type Side,
  type Align,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { useTooltipPortalContext } from '../portal/TooltipPortalContext';
import { POPUP_COLLISION_AVOIDANCE } from '@/internals/constants';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { usePositioner } from '@/utils/usePositioner';

/**
 * Positions the tooltip against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPositioner(componentProps: TooltipPositioner.Props) {
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

  const store = useTooltipRootContext(false);
  const keepMounted = useTooltipPortalContext();

  const floatingRootContext = store.useState('floatingRootContext');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const triggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const adaptiveOrigin = store.useState('adaptiveOrigin');
  const domReference = (floatingRootContext.value as any)?.useState('domReferenceElement');

  const previousTriggerRef = ref(null as Element | null);
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
      const prevTriggerElement = previousTriggerRef.value;

      if (current) {
        previousTriggerRef.value = current;
      }

      if (prevTriggerElement && current && current !== prevTriggerElement) {
        store.set('instantType', undefined);
        const ac = new AbortController();
        runOnceAnimationsFinish(() => {
          store.set('instantType', 'delay');
        }, ac.signal);

        return () => {
          ac.abort();
        };
      }

      return undefined;
    },
    {flush: 'post', immediate: true},
  );

  const state: TooltipPositionerState = {
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

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <TooltipPositionerContext.Provider value={positioner as any}>
      {element()}
    </TooltipPositionerContext.Provider>
  );
}

export interface TooltipPositionerState {
  /**
   * Whether the tooltip is currently open.
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

export interface TooltipPositionerProps
  extends UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', TooltipPositionerState> {
  children?: any;
  [key: string]: any;
}

export namespace TooltipPositioner {
  export type State = TooltipPositionerState;
  export type Props = TooltipPositionerProps;
}

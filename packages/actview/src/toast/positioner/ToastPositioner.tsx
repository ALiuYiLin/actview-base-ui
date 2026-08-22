import { computed } from 'actview';
import { isElement } from '@floating-ui/utils/dom';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import {
  useAnchorPositioning,
  type Side,
  type Align,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { POPUP_COLLISION_AVOIDANCE } from '@/internals/constants';
import { ToastPositionerContext } from '@/toast/positioner/ToastPositionerContext';
import type { ToastObject } from '@/toast/useToastManager';
import { useToastProviderContext } from '@/toast/provider/ToastProviderContext';
import { usePositioner } from '@/utils/usePositioner';

/**
 * Positions the toast against the anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastPositioner(componentProps: ToastPositioner.Props) {
  const {
    toast,
    render: _render,
    className: _className,
    style: _style,
    ...props
  } = componentProps;

  const store = useToastProviderContext().value!;

  const positionerProps = (toast.positionerProps ?? EMPTY_OBJECT) as NonNullable<
    typeof toast.positionerProps
  >;

  const {
    anchor: anchorProp = positionerProps.anchor,
    positionMethod = positionerProps.positionMethod ?? 'absolute',
    side = positionerProps.side ?? 'top',
    align = positionerProps.align ?? 'center',
    sideOffset = positionerProps.sideOffset ?? 0,
    alignOffset = positionerProps.alignOffset ?? 0,
    collisionBoundary = positionerProps.collisionBoundary ?? 'clipping-ancestors',
    collisionPadding = positionerProps.collisionPadding ?? 5,
    arrowPadding = positionerProps.arrowPadding ?? 5,
    sticky = positionerProps.sticky ?? false,
    disableAnchorTracking = positionerProps.disableAnchorTracking ?? false,
    collisionAvoidance = positionerProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE,
    ...elementProps
  } = props;

  const domIndex = store.useState('toastIndex', toast.id);
  const visibleIndex = store.useState('toastVisibleIndex', toast.id);

  const anchor = isElement(anchorProp) ? anchorProp : null;

  const positioning = useAnchorPositioning({
    anchor,
    positionMethod,
    mounted: true,
    side,
    sideOffset,
    align,
    alignOffset,
    collisionBoundary,
    collisionPadding,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    keepMounted: true,
    collisionAvoidance,
  });

  const state = computed<ToastPositionerState>(() => ({
    side: positioning.side.value,
    align: positioning.align.value,
    anchorHidden: positioning.anchorHidden.value,
  }));

  const styles = computed(() => ({
    ...(positioning.positionerStyles.value as Record<string, string | number>),
    '--toast-index': toast.transitionStatus === 'ending' ? domIndex.value : visibleIndex.value,
  }));

  const getElement = usePositioner(componentProps, state, {
    styles: styles as unknown as Parameters<typeof usePositioner>[2]['styles'],
    transitionStatus: computed(() => toast.transitionStatus),
    props: elementProps,
    refs: [componentProps.ref],
  });

  const contextValue = computed<ToastPositionerContext>(() => positioning);

  return (
    <ToastPositionerContext.Provider value={contextValue}>
      {getElement()}
    </ToastPositionerContext.Provider>
  );
}

export interface ToastPositionerState {
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
}

export interface ToastPositionerProps
  extends
    BaseUIComponentProps<'div', ToastPositionerState>,
    Omit<UseAnchorPositioningSharedParameters, 'side' | 'anchor'> {
  /**
   * An element to position the toast against.
   */
  anchor?: Element | null | undefined;
  /**
   * Which side of the anchor element to align the toast against.
   * May automatically change to avoid collisions.
   * @default 'top'
   */
  side?: Side | undefined;
  /**
   * The toast object associated with the positioner.
   */
  toast: ToastObject<any>;
}

export namespace ToastPositioner {
  export type State = ToastPositionerState;
  export type Props = ToastPositionerProps;
}

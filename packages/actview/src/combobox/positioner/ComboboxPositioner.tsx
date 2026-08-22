import { computed, watch } from 'actview';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import type { VirtualElement } from '@floating-ui/dom';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { ComboboxPositionerContext } from '@/combobox/positioner/ComboboxPositionerContext';
import { useListEmpty } from '@/combobox/utils/parts';
import {
  type Side,
  type Align,
  useAnchorPositioning,
  type UseAnchorPositioningSharedParameters,
} from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '@/internals/types';
import { useComboboxPortalContext } from '@/combobox/portal/ComboboxPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE } from '@/internals/constants';
import { InternalBackdrop } from '@/utils/InternalBackdrop';
import { usePositioner } from '@/utils/usePositioner';
import { useAnchoredPopupScrollLock } from '@/utils/useAnchoredPopupScrollLock';

/**
 * Positions the popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxPositioner(componentProps: ComboboxPositioner.Props) {
  const {
    render: _render,
    className: _className,
    anchor: anchorProp,
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
    collisionAvoidance = DROPDOWN_COLLISION_AVOIDANCE,
    style: _style,
    ...elementProps
  } = componentProps;

  const store = useComboboxRootContext();
  const keepMounted = useComboboxPortalContext().value ?? false;

  const modal = store.useState('modal');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inputGroupElement = store.useState('inputGroupElement');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const transitionStatus = store.useState('transitionStatus');

  const empty = useListEmpty();
  const resolvedAnchor = computed(() =>
    (anchorProp ??
      (inputInsidePopup.value
        ? triggerElement.value
        : (inputGroupElement.value ?? inputElement.value))) as Element | VirtualElement | null,
  );

  const positioning = useAnchorPositioning({
    anchor: () => resolvedAnchor.value,
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
    lazyFlip: true,
  });

  useAnchoredPopupScrollLock(
    computed(() => open.value && modal.value),
    computed(() => openMethod.value === 'touch'),
    positionerElement,
    triggerElement,
  );

  const state = computed<ComboboxPositionerState>(() => ({
    open: open.value,
    side: positioning.side.value,
    align: positioning.align.value,
    anchorHidden: positioning.anchorHidden.value,
    empty: empty.value,
  }));

  // Sync the popup side into the store (layout-effect equivalent).
  watch(
    [positioning.side],
    () => {
      store.set('popupSide', positioning.side.value);
    },
    { immediate: true },
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

  const contextValue = computed<ComboboxPositionerContext>(() => ({
    side: positioning.side,
    align: positioning.align,
    arrowRef: positioning.arrowRef,
    arrowUncentered: positioning.arrowUncentered,
    arrowStyles: positioning.arrowStyles,
    anchorHidden: positioning.anchorHidden,
    isPositioned: positioning.isPositioned,
  }));

  return (
    <ComboboxPositionerContext.Provider value={contextValue}>
      {mounted.value && modal.value && (
        <InternalBackdrop
          inert={inertValue(!open.value)}
          cutout={inputGroupElement.value ?? inputElement.value ?? triggerElement.value}
        />
      )}
      {getElement()}
    </ComboboxPositionerContext.Provider>
  );
}

export interface ComboboxPositionerState {
  /**
   * Whether the popup is currently open.
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
   * Whether there are no items to display.
   */
  empty: boolean;
}

export interface ComboboxPositionerProps
  extends
    UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', ComboboxPositionerState> {}

export namespace ComboboxPositioner {
  export type State = ComboboxPositionerState;
  export type Props = ComboboxPositionerProps;
}

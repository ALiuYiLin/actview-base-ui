import {
  getSide,
  getAlignment,
  getSideAxis,
  evaluate,
  clamp,
  getAlignmentAxis,
  getAxisLength,
  getPaddingObject,
  type Rect,
} from '@floating-ui/utils';
import {
  autoUpdate,
  computePosition,
  flip,
  limitShift,
  offset,
  shift as floatingShift,
  size,
  type Middleware,
  type Placement,
  type VirtualElement,
  type Padding,
  type Side as PhysicalSide,
  type MiddlewareState,
  type AutoUpdateOptions,
  type Derivable,
  type Strategy,
} from '@floating-ui/dom';
import { ownerDocument, ownerWindow } from '@base-ui/actview-utils/owner';
import { computed, ref, unref, watch } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import { useDirection } from './direction-context/DirectionContext';
import type { StyleValue } from './types';

const AVAILABLE_WIDTH_VAR = '--available-width';
const AVAILABLE_HEIGHT_VAR = '--available-height';

// Self-contained stand-in for the react version's `DEFAULT_SIDES` (utils/adaptiveOriginConstants),
// which is not ported yet.
const DEFAULT_SIDES = {
  sideX: 'left',
  sideY: 'top',
} as const;

function getLogicalSide(sideParam: Side, renderedSide: PhysicalSide, isRtl: boolean): Side {
  const isLogicalSideParam = sideParam === 'inline-start' || sideParam === 'inline-end';
  const logicalRight = isRtl ? 'inline-start' : 'inline-end';
  const logicalLeft = isRtl ? 'inline-end' : 'inline-start';
  return (
    {
      top: 'top',
      right: isLogicalSideParam ? logicalRight : 'right',
      bottom: 'bottom',
      left: isLogicalSideParam ? logicalLeft : 'left',
    } satisfies Record<PhysicalSide, Side>
  )[renderedSide];
}

function getOffsetData(state: MiddlewareState, sideParam: Side, isRtl: boolean) {
  const { rects, placement } = state;
  const data = {
    side: getLogicalSide(sideParam, getSide(placement), isRtl),
    align: getAlignment(placement) || 'center',
    anchor: { width: rects.reference.width, height: rects.reference.height },
    positioner: { width: rects.floating.width, height: rects.floating.height },
  } as const;
  return data;
}

export type Side = 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
export type Align = 'start' | 'center' | 'end';
export type Boundary = 'clipping-ancestors' | Element | Element[] | Rect;
export type OffsetFunction = (data: {
  side: Side;
  align: Align;
  anchor: { width: number; height: number };
  positioner: { width: number; height: number };
}) => number;

interface SideFlipMode {
  /**
   * How to avoid collisions on the side axis.
   * - `'flip'`: If there is not enough space, place the popup on the opposite side.
   * - `'none'`: Keep the preferred side even if it overflows.
   */
  side?: 'flip' | 'none' | undefined;
  /**
   * How to avoid collisions on the align axis.
   * - `'flip'`: If there is not enough space, swap `'start'` and `'end'` alignment.
   * - `'shift'`: Keep the alignment and shift the popup to fit within the boundary.
   * - `'none'`: Keep the preferred alignment even if it overflows.
   */
  align?: 'flip' | 'shift' | 'none' | undefined;
  /**
   * If both sides on the preferred axis do not fit, determines whether to fallback
   * to a side on the perpendicular axis and which logical side to prefer.
   * - `'start'`: Prefer the logical start side on the perpendicular axis.
   * - `'end'`: Prefer the logical end side on the perpendicular axis.
   * - `'none'`: Do not fallback to the perpendicular axis.
   */
  fallbackAxisSide?: 'start' | 'end' | 'none' | undefined;
}

interface SideShiftMode {
  /**
   * How to avoid collisions on the side axis.
   * - `'shift'`: Keep the preferred side and shift the popup to fit within the boundary.
   * - `'none'`: Keep the preferred side even if it overflows.
   */
  side?: 'shift' | 'none' | undefined;
  /**
   * How to avoid collisions on the align axis.
   * - `'shift'`: Keep the alignment and shift the popup to fit within the boundary.
   * - `'none'`: Keep the preferred alignment even if it overflows.
   */
  align?: 'shift' | 'none' | undefined;
  /**
   * If both sides on the preferred axis do not fit, determines whether to fallback
   * to a side on the perpendicular axis and which logical side to prefer.
   * - `'start'`: Prefer the logical start side on the perpendicular axis.
   * - `'end'`: Prefer the logical end side on the perpendicular axis.
   * - `'none'`: Do not fallback to the perpendicular axis.
   */
  fallbackAxisSide?: 'start' | 'end' | 'none' | undefined;
}

export type CollisionAvoidance = SideFlipMode | SideShiftMode;

type MaybeRef<T> = T | Ref<T>;

/**
 * Provides standardized anchor positioning behavior for floating elements. Wraps Floating UI's
 * `computePosition`/`autoUpdate` (the `@floating-ui/dom` implementation instead of the React
 * version's `@floating-ui/react-dom`).
 *
 * Notes on deviations from the React version:
 * - `floatingRootContext`, `nodeId`, `externalTree` (all `@floating-ui/react-dom` FloatingTree
 *   concepts) are dropped; the returned `context` is `undefined`.
 * - Reactive outputs (`positionerStyles`, `arrowStyles`, `side`, `align`, `physicalSide`,
 *   `anchorHidden`, `arrowUncentered`, `isPositioned`) are returned as `ComputedRef`s — read
 *   `.value` inside render functions.
 * - `useAnchorPositioningWithHook` is dropped (it was only used to inject the React `useFloating`
 *   hook and in tests).
 */
export function useAnchorPositioning(
  params: UseAnchorPositioningParameters,
): UseAnchorPositioningReturnValue {
  const {
    // Public parameters
    anchor,
    positionMethod = 'absolute',
    side: sideParam = 'bottom',
    sideOffset = 0,
    align = 'center',
    alignOffset = 0,
    collisionBoundary,
    collisionPadding: collisionPaddingParam = 5,
    sticky = false,
    arrowPadding = 5,
    disableAnchorTracking = false,
    inline: inlineMiddleware,
    // Private parameters
    keepMounted = false,
    mounted,
    collisionAvoidance,
    shift,
    adaptiveOrigin,
    lazyFlip = false,
  } = params;

  const mountSide = ref<PhysicalSide | null>(null);

  const collisionAvoidanceSide = collisionAvoidance.side || 'flip';
  const collisionAvoidanceAlign = collisionAvoidance.align || 'flip';
  const collisionAvoidanceFallbackAxisSide = collisionAvoidance.fallbackAxisSide || 'end';
  const shiftCrossAxis = shift?.crossAxis ?? false;
  const shiftRootBoundary = shift?.rootBoundary;

  const anchorFn = typeof anchor === 'function' ? anchor : undefined;

  const direction = useDirection();
  const isRtl = computed(() => direction.value === 'rtl');

  const side = computed<PhysicalSide>(() => {
    const ms = mountSide.value;
    if (ms) {
      return ms;
    }
    return (
      {
        top: 'top',
        right: 'right',
        bottom: 'bottom',
        left: 'left',
        'inline-end': isRtl.value ? 'left' : 'right',
        'inline-start': isRtl.value ? 'right' : 'left',
      } satisfies Record<Side, PhysicalSide>
    )[sideParam];
  });

  const placement = computed<Placement>(() =>
    align === 'center' ? side.value : (`${side.value}-${align}` as Placement),
  );

  let collisionPadding = collisionPaddingParam as {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  if (typeof collisionPadding === 'number') {
    collisionPadding = {
      top: collisionPadding,
      right: collisionPadding,
      bottom: collisionPadding,
      left: collisionPadding,
    };
  } else if (collisionPadding) {
    collisionPadding = {
      top: collisionPadding.top || 0,
      right: collisionPadding.right || 0,
      bottom: collisionPadding.bottom || 0,
      left: collisionPadding.left || 0,
    };
  }

  // Create a bias to the preferred side.
  // On iOS, when the mobile software keyboard opens, the input is exactly centered
  // in the viewport, but this can cause it to flip to the top undesirably.
  // The bias is only applied to `flip()` so it doesn't shift the resting position
  // computed by `shift()` and `size()` away from the requested `collisionPadding`.
  const bias = 1;
  const biasTop = sideParam === 'bottom' ? bias : 0;
  const biasBottom = sideParam === 'top' ? bias : 0;
  const biasLeft = sideParam === 'right' ? bias : 0;
  const biasRight = sideParam === 'left' ? bias : 0;

  const commonCollisionProps = {
    boundary: collisionBoundary === 'clipping-ancestors' ? 'clippingAncestors' : collisionBoundary,
    padding: collisionPadding,
  } as const;

  // Using a ref assumes that the arrow element is always present in the DOM for the lifetime of the
  // popup. If this assumption ends up being false, we can switch to state to manage the arrow's
  // presence.
  const arrowRef = { current: null as Element | null };

  // Keep these reactive if they're not functions.
  const sideOffsetDep = typeof sideOffset !== 'function' ? sideOffset : 0;
  const alignOffsetDep = typeof alignOffset !== 'function' ? alignOffset : 0;

  const middleware: Array<Middleware | null | undefined | false> = [];

  if (inlineMiddleware) {
    middleware.push(inlineMiddleware);
  }

  middleware.push(
    offset(
      (state) => {
        const data = getOffsetData(state, sideParam, isRtl.value);

        const sideAxis =
          typeof sideOffset === 'function' ? sideOffset(data) : sideOffset;
        const alignAxis =
          typeof alignOffset === 'function' ? alignOffset(data) : alignOffset;

        return {
          mainAxis: sideAxis,
          crossAxis: alignAxis,
          alignmentAxis: alignAxis,
        };
      },
    ),
  );

  const shiftDisabled = collisionAvoidanceAlign === 'none' && collisionAvoidanceSide !== 'shift';
  const crossAxisShiftEnabled =
    !shiftDisabled && (sticky || shiftCrossAxis || collisionAvoidanceSide === 'shift');

  const flipMiddleware =
    collisionAvoidanceSide === 'none'
      ? null
      : flip({
          ...commonCollisionProps,
          // Ensure the popup flips if it's been limited by its --available-height and it resizes.
          // Since the size() padding is smaller than the flip() padding, flip() will take precedence.
          padding: {
            top: collisionPadding.top + bias + biasTop,
            right: collisionPadding.right + bias + biasRight,
            bottom: collisionPadding.bottom + bias + biasBottom,
            left: collisionPadding.left + bias + biasLeft,
          },
          mainAxis: !shiftCrossAxis && collisionAvoidanceSide === 'flip',
          crossAxis: collisionAvoidanceAlign === 'flip' ? 'alignment' : false,
          fallbackAxisSideDirection: collisionAvoidanceFallbackAxisSide,
        });
  const shiftMiddleware = shiftDisabled
    ? null
    : floatingShift({
        ...commonCollisionProps,
        // Use the Layout Viewport to avoid shifting around when pinch-zooming.
        rootBoundary: shiftRootBoundary,
        mainAxis: collisionAvoidanceAlign !== 'none',
        crossAxis: crossAxisShiftEnabled,
        limiter:
          sticky || shiftCrossAxis
            ? undefined
            : limitShift((limitData) => {
                if (!arrowRef.current) {
                  return {};
                }
                const { width, height } = arrowRef.current.getBoundingClientRect();
                const sideAxis = getSideAxis(getSide(limitData.placement));
                const arrowSize = sideAxis === 'y' ? width : height;
                const offsetAmount =
                  sideAxis === 'y'
                    ? collisionPadding.left + collisionPadding.right
                    : collisionPadding.top + collisionPadding.bottom;
                return {
                  offset: arrowSize / 2 + offsetAmount / 2,
                };
              }),
      });

  // https://floating-ui.com/docs/flip#combining-with-shift
  if (
    collisionAvoidanceSide === 'shift' ||
    collisionAvoidanceAlign === 'shift' ||
    align === 'center'
  ) {
    middleware.push(shiftMiddleware, flipMiddleware);
  } else {
    middleware.push(flipMiddleware, shiftMiddleware);
  }

  middleware.push(
    size({
      ...commonCollisionProps,
      apply({ elements: { floating }, availableWidth, availableHeight, rects }) {
        if (!unref(mounted)) {
          return;
        }

        const floatingStyle = floating.style;
        floatingStyle.setProperty(AVAILABLE_WIDTH_VAR, `${availableWidth}px`);
        floatingStyle.setProperty(AVAILABLE_HEIGHT_VAR, `${availableHeight}px`);

        // Snap anchor dimensions to device pixels to ensure the popup's visual width matches the anchor's one.
        const dpr = ownerWindow(floating).devicePixelRatio || 1;
        const { x, y, width, height } = rects.reference;
        const anchorWidth = (Math.round((x + width) * dpr) - Math.round(x * dpr)) / dpr;
        const anchorHeight = (Math.round((y + height) * dpr) - Math.round(y * dpr)) / dpr;

        floatingStyle.setProperty('--anchor-width', `${anchorWidth}px`);
        floatingStyle.setProperty('--anchor-height', `${anchorHeight}px`);
      },
    }),
    arrow(
      (state) => ({
        // `transform-origin` calculations rely on an element existing. If the arrow hasn't been set,
        // we'll create a fake element.
        element: arrowRef.current || ownerDocument(state.elements.floating).createElement('div'),
        padding: arrowPadding,
        offsetParent: 'floating',
      }),
    ),
    {
      name: 'transformOrigin',
      fn(state) {
        const { elements, middlewareData, placement: renderedPlacement, rects, y } = state;

        const currentRenderedSide = getSide(renderedPlacement);
        const currentRenderedAxis = getSideAxis(currentRenderedSide);
        const arrowEl = arrowRef.current;
        const arrowX = middlewareData.arrow?.x || 0;
        const arrowY = middlewareData.arrow?.y || 0;
        const arrowWidth = arrowEl?.clientWidth || 0;
        const arrowHeight = arrowEl?.clientHeight || 0;
        const transformX = arrowX + arrowWidth / 2;
        const transformY = arrowY + arrowHeight / 2;
        const shiftY = Math.abs(middlewareData.shift?.y || 0);
        const halfAnchorHeight = rects.reference.height / 2;
        const sideOffsetValue =
          typeof sideOffset === 'function'
            ? sideOffset(getOffsetData(state, sideParam, isRtl.value))
            : sideOffset;
        const isOverlappingAnchor = shiftY > sideOffsetValue;

        const adjacentTransformOrigin = {
          top: `${transformX}px calc(100% + ${sideOffsetValue}px)`,
          bottom: `${transformX}px ${-sideOffsetValue}px`,
          left: `calc(100% + ${sideOffsetValue}px) ${transformY}px`,
          right: `${-sideOffsetValue}px ${transformY}px`,
        }[currentRenderedSide];
        const overlapTransformOrigin = `${transformX}px ${rects.reference.y + halfAnchorHeight - y}px`;

        elements.floating.style.setProperty(
          '--transform-origin',
          crossAxisShiftEnabled && currentRenderedAxis === 'y' && isOverlappingAnchor
            ? overlapTransformOrigin
            : adjacentTransformOrigin,
        );

        return {};
      },
    },
    hide,
    adaptiveOrigin,
  );

  const autoUpdateOptions: AutoUpdateOptions = {
    elementResize: !disableAnchorTracking && typeof ResizeObserver !== 'undefined',
    layoutShift: !disableAnchorTracking && typeof IntersectionObserver !== 'undefined',
  };

  // DOM template refs.
  const anchorElementRef = { current: null as Element | null };
  const positionerRef = { current: null as HTMLElement | null };
  const positionReferenceRef = { current: null as Element | VirtualElement | null };

  const refs: UseAnchorPositioningReturnValue['refs'] = {
    setReference(node) {
      anchorElementRef.current = node;
    },
    setFloating(node) {
      positionerRef.current = node;
    },
    setPositionReference(node) {
      positionReferenceRef.current = node;
    },
    reference: anchorElementRef,
    floating: positionerRef,
  };

  const x = ref(0);
  const y = ref(0);
  const renderedPlacement = ref<Placement>(placement.value);
  const middlewareData = ref<Record<string, any>>({});
  const isPositioned = ref(false);

  function resolveAnchor(): Element | VirtualElement | null {
    let value: any = typeof anchorFn === 'function' ? anchorFn() : anchor;
    if (typeof value === 'function') {
      value = value();
    }
    if (value == null) {
      return null;
    }
    if (typeof value === 'object' && ('current' in value || 'value' in value)) {
      return (value.current ?? value.value) || null;
    }
    return value as Element | VirtualElement;
  }

  function applyPosition(reference: Element | VirtualElement, floating: HTMLElement) {
    return computePosition(reference, floating, {
      placement: placement.value,
      middleware,
      strategy: positionMethod as Strategy,
    }).then((data) => {
      x.value = data.x;
      y.value = data.y;
      renderedPlacement.value = data.placement;
      middlewareData.value = data.middlewareData;
      isPositioned.value = true;
    });
  }

  const update = () => {
    const reference = positionReferenceRef.current ?? resolveAnchor() ?? anchorElementRef.current;
    const floating = positionerRef.current;
    if (!reference || !floating || !unref(mounted)) {
      return;
    }
    void applyPosition(reference, floating);
  };

  // Reset the locked flip side when the popup unmounts.
  watch(
    () => unref(mounted),
    (m) => {
      if (!m && mountSide.value !== null) {
        mountSide.value = null;
      }
    },
  );

  // Locks the flip (makes it "sticky") so it doesn't prefer a given placement
  // and flips back lazily, not eagerly. Ideal for filtered lists that change
  // the size of the popup dynamically to avoid unwanted flipping when typing.
  watch(
    [() => unref(mounted), isPositioned, renderedPlacement],
    ([m, positioned, rSide]) => {
      if (lazyFlip && m && positioned && rSide !== side.value) {
        mountSide.value = rSide;
      }
    },
  );

  // (Re)position whenever the mounted state, placement, or direction changes. The
  // positioning runs post-flush so DOM template refs are populated by then.
  let stopAutoUpdate: (() => void) | undefined;

  watch(
    [() => unref(mounted), placement, isRtl],
    (_new, _old, onCleanup) => {
      stopAutoUpdate?.();
      stopAutoUpdate = undefined;

      if (!unref(mounted)) {
        isPositioned.value = false;
        return;
      }

      const reference = positionReferenceRef.current ?? resolveAnchor() ?? anchorElementRef.current;
      const floating = positionerRef.current;
      if (!reference || !floating) {
        isPositioned.value = false;
        return;
      }

      const run = () => {
        void applyPosition(reference, floating);
      };

      run();
      stopAutoUpdate = autoUpdate(reference, floating, run, autoUpdateOptions);

      onCleanup(() => {
        stopAutoUpdate?.();
        stopAutoUpdate = undefined;
      });
    },
    { immediate: true, flush: 'post' },
  );

  const renderedSide = computed<PhysicalSide>(() => getSide(renderedPlacement.value));
  const logicalRenderedSide = computed<Side>(() =>
    getLogicalSide(sideParam, renderedSide.value, isRtl.value),
  );
  const renderedAlign = computed<Align>(() => getAlignment(renderedPlacement.value) || 'center');
  const anchorHidden = computed(() => Boolean(middlewareData.value.hide?.referenceHidden));

  const positionerStyles = computed<StyleValue>(() => {
    const strategy = positionMethod as 'absolute' | 'fixed';
    const { sideX, sideY } = middlewareData.value.adaptiveOrigin || DEFAULT_SIDES;

    let base: Record<string, string | number>;
    if (!isPositioned.value) {
      // Until a position for the current open is computed, ignore any coordinates retained from a
      // previous open (or from a pass that measured the hidden popup as 0x0).
      base = { position: 'fixed', top: 0, left: 0 };
    } else if (adaptiveOrigin) {
      base = { position: strategy, [sideX]: x.value, [sideY]: y.value };
    } else {
      base = { position: strategy, top: `${y.value}px`, left: `${x.value}px` };
    }

    // Seed the available size vars so consumer `max-height: min(x, var(--available-height))` rules
    // resolve to a valid length on the first positioning pass, before `size()` writes the real values.
    base[AVAILABLE_WIDTH_VAR] = '100vw';
    base[AVAILABLE_HEIGHT_VAR] = '100vh';

    if (!isPositioned.value) {
      base.opacity = 0;
    }
    return base;
  });

  const arrowStyles = computed<StyleValue>(() => {
    const arrowData = middlewareData.value.arrow;
    return {
      position: 'absolute',
      top: arrowData?.y ?? 0,
      left: arrowData?.x ?? 0,
    };
  });

  const arrowUncentered = computed(() => middlewareData.value.arrow?.centerOffset !== 0);

  return {
    positionerStyles,
    arrowStyles,
    arrowRef,
    arrowUncentered,
    side: logicalRenderedSide,
    align: renderedAlign,
    physicalSide: renderedSide,
    anchorHidden,
    refs,
    context: undefined,
    isPositioned,
    update,
  };
}

/**
 * Fork of Floating UI's `arrow` middleware that allows configuring the offset parent.
 * The `@floating-ui/dom` `arrow` middleware always uses the real offset parent; Base UI needs
 * `offsetParent: 'floating'`. `deps` is dropped (no React dependency list in ActView).
 */
interface ArrowOptions {
  /**
   * The arrow element to be positioned.
   * @default undefined
   */
  element: any;
  /**
   * The padding between the arrow element and the floating element edges.
   * Useful when the floating element has rounded corners.
   * @default 0
   */
  padding?: Padding | undefined;
  /**
   * Which element to use as the offset parent.
   * @default 'real'
   */
  offsetParent: 'real' | 'floating';
}

const arrow = (options: ArrowOptions | Derivable<ArrowOptions>): Middleware => ({
  name: 'arrow',
  options,
  async fn(state) {
    const { x, y, placement, rects, platform, elements, middlewareData } = state;
    const { element, padding = 0, offsetParent = 'real' } = evaluate(options, state) || {};

    if (element == null) {
      return {};
    }

    const paddingObject = getPaddingObject(padding);
    const coords = { x, y };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform.getDimensions(element);
    const isYAxis = axis === 'y';
    const minProp = isYAxis ? 'top' : 'left';
    const maxProp = isYAxis ? 'bottom' : 'right';
    const clientProp = isYAxis ? 'clientHeight' : 'clientWidth';

    const endDiff =
      rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];

    const arrowOffsetParent =
      offsetParent === 'real' ? await platform.getOffsetParent?.(element) : elements.floating;
    let clientSize = elements.floating[clientProp] || rects.floating[length];

    // DOM platform can return `window` as the `offsetParent`.
    if (!clientSize || !(await platform.isElement?.(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }

    const centerToReference = endDiff / 2 - startDiff / 2;

    // If the padding is large enough that it causes the arrow to no longer be
    // centered, modify the padding so that it is centered.
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = Math.min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = Math.min(paddingObject[maxProp], largestPossiblePadding);

    // Make sure the arrow doesn't overflow the floating element if the center
    // point is outside the floating element's bounds.
    const min = minPadding;
    const max = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset = clamp(min, center, max);

    // If the reference is small enough that the arrow's padding causes it to
    // point to nothing for an aligned placement, adjust the offset of the
    // floating element itself. To ensure `shift()` continues to take action,
    // a single reset is performed when this is true.
    const shouldAddOffset =
      !middlewareData.arrow &&
      getAlignment(placement) != null &&
      center !== offset &&
      rects.reference[length] / 2 -
        (center < min ? minPadding : maxPadding) -
        arrowDimensions[length] / 2 <
        0;
    // eslint-disable-next-line no-nested-ternary
    const alignmentOffset = shouldAddOffset ? (center < min ? center - min : center - max) : 0;

    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset,
        centerOffset: center - offset - alignmentOffset,
        ...(shouldAddOffset && { alignmentOffset }),
      },
      reset: shouldAddOffset,
    };
  },
});

/**
 * Mirrors Floating UI's `hide()` referenceHidden strategy (utils/hideMiddleware in the React
 * source). Floating UI injects `detectOverflow` into the middleware platform before invoking
 * middleware.
 */
const hide: Middleware = {
  name: 'hide',
  async fn(state) {
    const { width, height, x, y } = state.rects.reference;
    const anchorHidden = width === 0 && height === 0 && x === 0 && y === 0;
    const overflow = state.platform.detectOverflow
      ? await state.platform.detectOverflow(state, {
          elementContext: 'reference',
        })
      : null;
    const referenceHidden =
      overflow != null &&
      (overflow.top - height >= 0 ||
        overflow.right - width >= 0 ||
        overflow.bottom - height >= 0 ||
        overflow.left - width >= 0);

    return {
      data: {
        referenceHidden: referenceHidden || anchorHidden,
      },
    };
  },
};

export interface UseAnchorPositioningSharedParameters {
  /**
   * An element to position the popup against.
   * By default, the popup will be positioned against the trigger.
   */
  anchor?:
    | Element
    | null
    | VirtualElement
    | { current?: Element | null; value?: Element | null }
    | (() => Element | VirtualElement | null)
    | undefined;
  /**
   * Determines which CSS `position` property to use.
   * @default 'absolute'
   */
  positionMethod?: 'absolute' | 'fixed' | undefined;
  /**
   * Which side of the anchor element to align the popup against.
   * May automatically change to avoid collisions.
   * @default 'bottom'
   */
  side?: Side | undefined;
  /**
   * Distance between the anchor and the popup in pixels.
   * Also accepts a function that returns the distance to read the dimensions of the anchor
   * and positioner elements, along with its side and alignment.
   *
   * The function takes a `data` object parameter with the following properties:
   * - `data.anchor`: the dimensions of the anchor element with properties `width` and `height`.
   * - `data.positioner`: the dimensions of the positioner element with properties `width` and `height`.
   * - `data.side`: which side of the anchor element the positioner is aligned against.
   * - `data.align`: how the positioner is aligned relative to the specified side.
   *
   * @example
   * ```jsx
   * <Positioner
   *   sideOffset={({ side, align, anchor, positioner }) => {
   *     return side === 'top' || side === 'bottom'
   *       ? anchor.height
   *       : anchor.width;
   *   }}
   * />
   * ```
   *
   * @default 0
   */
  sideOffset?: number | OffsetFunction | undefined;
  /**
   * How to align the popup relative to the specified side.
   * @default 'center'
   */
  align?: Align | undefined;
  /**
   * Additional offset along the alignment axis in pixels.
   * Also accepts a function that returns the offset to read the dimensions of the anchor
   * and positioner elements, along with its side and alignment.
   *
   * The function takes a `data` object parameter with the following properties:
   * - `data.anchor`: the dimensions of the anchor element with properties `width` and `height`.
   * - `data.positioner`: the dimensions of the positioner element with properties `width` and `height`.
   * - `data.side`: which side of the anchor element the positioner is aligned against.
   * - `data.align`: how the positioner is aligned relative to the specified side.
   *
   * @example
   * ```jsx
   * <Positioner
   *   alignOffset={({ side, align, anchor, positioner }) => {
   *     return side === 'top' || side === 'bottom'
   *       ? anchor.width
   *       : anchor.height;
   *   }}
   * />
   * ```
   *
   * @default 0
   */
  alignOffset?: number | OffsetFunction | undefined;
  /**
   * An element or a rectangle that delimits the area that the popup is confined to.
   * @default 'clipping-ancestors'
   */
  collisionBoundary?: Boundary | undefined;
  /**
   * Additional space to maintain from the edge of the collision boundary.
   * @default 5
   */
  collisionPadding?: Padding | undefined;
  /**
   * Whether to maintain the popup in the viewport after
   * the anchor element was scrolled out of view.
   * @default false
   */
  sticky?: boolean | undefined;
  /**
   * Minimum distance to maintain between the arrow and the edges of the popup.
   *
   * Use it to prevent the arrow element from hanging out of the rounded corners of a popup.
   * @default 5
   */
  arrowPadding?: number | undefined;
  /**
   * Whether to disable the popup from tracking any layout shift of its positioning anchor.
   * @default false
   */
  disableAnchorTracking?: boolean | undefined;
  /**
   * Determines how to handle collisions when positioning the popup.
   *
   * `side` controls overflow on the preferred placement axis (`top`/`bottom` or `left`/`right`):
   * - `'flip'`: keep the requested side when it fits; otherwise try the opposite side
   *   (`top` and `bottom`, or `left` and `right`).
   * - `'shift'`: never change side; keep the requested side and move the popup within
   *   the clipping boundary so it stays visible.
   * - `'none'`: do not correct side-axis overflow.
   *
   * `align` controls overflow on the alignment axis (`start`/`center`/`end`):
   * - `'flip'`: keep side, but swap `start` and `end` when the requested alignment overflows.
   * - `'shift'`: keep side and requested alignment, then nudge the popup along the
   *   alignment axis to fit.
   * - `'none'`: do not correct alignment-axis overflow.
   *
   * `fallbackAxisSide` controls fallback behavior on the perpendicular axis when the
   * preferred axis cannot fit:
   * - `'start'`: allow perpendicular fallback and try the logical start side first
   *   (`top` before `bottom`, or `left` before `right` in LTR).
   * - `'end'`: allow perpendicular fallback and try the logical end side first
   *   (`bottom` before `top`, or `right` before `left` in LTR).
   * - `'none'`: do not fallback to the perpendicular axis.
   *
   * When `side` is `'shift'`, explicitly setting `align` only supports `'shift'` or `'none'`.
   * If `align` is omitted, it defaults to `'flip'`.
   *
   * @example
   * ```jsx
   * <Positioner
   *   collisionAvoidance={{
   *     side: 'shift',
   *     align: 'shift',
   *     fallbackAxisSide: 'none',
   *   }}
   * />
   * ```
   *
   */
  collisionAvoidance?: CollisionAvoidance | undefined;
}

export interface UseAnchorPositioningParameters extends UseAnchorPositioningSharedParameters {
  keepMounted?: boolean | undefined;
  mounted: MaybeRef<boolean>;
  disableAnchorTracking?: boolean | undefined;
  adaptiveOrigin?: Middleware | undefined;
  collisionAvoidance: CollisionAvoidance;
  shift?:
    | {
        crossAxis?: boolean | undefined;
        rootBoundary?: 'layoutViewport' | undefined;
      }
    | undefined;
  lazyFlip?: boolean | undefined;
  /**
   * Optional middleware that can replace the measured reference rect before offsets and collision
   * middleware run. Used by Preview Card to position against a specific inline line box.
   */
  inline?: Middleware | undefined;
}

export interface UseAnchorPositioningReturnValue {
  positionerStyles: ComputedRef<StyleValue>;
  arrowStyles: ComputedRef<StyleValue>;
  arrowRef: { current: Element | null };
  arrowUncentered: ComputedRef<boolean>;
  side: ComputedRef<Side>;
  align: ComputedRef<Align>;
  physicalSide: ComputedRef<PhysicalSide>;
  anchorHidden: ComputedRef<boolean>;
  refs: {
    reference: { current: Element | null };
    floating: { current: HTMLElement | null };
    setReference: (node: Element | null) => void;
    setFloating: (node: HTMLElement | null) => void;
    setPositionReference: (node: Element | VirtualElement | null) => void;
  };
  /**
   * Placeholder for `@floating-ui/react-dom`'s `FloatingContext`; always `undefined` in ActView.
   */
  context: undefined;
  isPositioned: ComputedRef<boolean>;
  update: () => void;
}

import { computed, ref, toValue, watch } from 'actview';
import type { ComputedRef } from 'actview';
import { getSide, getAlignment, type Rect, getSideAxis } from '@floating-ui/utils';
import { ownerDocument, ownerWindow } from '@/internals/owner';
import { useStableCallback } from '@/utils/useStableCallback';
import {
  autoUpdate,
  flip,
  limitShift,
  offset,
  shift as floatingShift,
  size,
} from '@floating-ui/dom';
import type {
  Middleware,
  MiddlewareState,
  Placement,
  VirtualElement,
} from '@/floating-ui-react/types';
import { useBaseUIFloating } from '@/floating-ui-react/hooks/useFloating';
import { useDirection } from './direction-context/DirectionContext';
import { arrow } from '@/floating-ui-react/middleware/arrow';
import { hide } from '@/utils/hideMiddleware';
import { DEFAULT_SIDES } from '@/utils/adaptiveOriginConstants';
import type { FloatingRootStore } from '@/floating-ui-react/components/FloatingRootStore';
import type { FloatingTreeStore } from '@/floating-ui-react/components/FloatingTreeStore';

const AVAILABLE_WIDTH_VAR = '--available-width';
const AVAILABLE_HEIGHT_VAR = '--available-height';

export type PhysicalSide = 'top' | 'bottom' | 'left' | 'right';

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
  const {rects, placement} = state;
  const data = {
    side: getLogicalSide(sideParam, getSide(placement), isRtl),
    align: getAlignment(placement) || 'center',
    anchor: {width: rects.reference.width, height: rects.reference.height},
    positioner: {width: rects.floating.width, height: rects.floating.height},
  } as const;
  return data;
}

export type Side = 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
export type Align = 'start' | 'center' | 'end';
export type Boundary = 'clipping-ancestors' | Element | Element[] | Rect;
export type OffsetFunction = (data: {
  side: Side;
  align: Align;
  anchor: {width: number; height: number};
  positioner: {width: number; height: number};
}) => number;

interface SideFlipMode {
  side?: 'flip' | 'none' | undefined;
  align?: 'flip' | 'shift' | 'none' | undefined;
  fallbackAxisSide?: 'start' | 'end' | 'none' | undefined;
}

interface SideShiftMode {
  side?: 'shift' | 'none' | undefined;
  align?: 'shift' | 'none' | undefined;
  fallbackAxisSide?: 'start' | 'end' | 'none' | undefined;
}

export type CollisionAvoidance = SideFlipMode | SideShiftMode;

/**
 * Provides standardized anchor positioning behavior for floating elements.
 * (actview 版：store 模式；position 字段读 .value；useIsoLayoutEffect → watch flush post。)
 */
export function useAnchorPositioning(
  params: UseAnchorPositioningParameters & {floatingRootContext: FloatingRootStore},
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
    floatingRootContext,
    mounted,
    collisionAvoidance,
    shift,
    nodeId,
    adaptiveOrigin,
    lazyFlip = false,
    externalTree,
  } = params;

  const mountedValue = toValue(mounted) ?? false;

  const mountSide = ref<PhysicalSide | null>(null);

  if (!mountedValue && mountSide.value !== null) {
    mountSide.value = null;
  }

  const collisionAvoidanceSide = collisionAvoidance.side || 'flip';
  const collisionAvoidanceAlign = collisionAvoidance.align || 'flip';
  const collisionAvoidanceFallbackAxisSide = collisionAvoidance.fallbackAxisSide || 'end';
  const shiftCrossAxis = shift?.crossAxis ?? false;
  const shiftRootBoundary = shift?.rootBoundary;

  const anchorFn = typeof anchor === 'function' ? anchor : undefined;
  const anchorFnCallback = useStableCallback(anchorFn as any);
  const anchorDep = anchorFn ? anchorFnCallback : anchor;
  const anchorValueRef = {current: anchor};
  const mountedRef = {current: mountedValue};

  const direction = useDirection();
  const isRtl = direction.value === 'rtl';

  const side: PhysicalSide =
    mountSide.value ||
    (
      {
        top: 'top',
        right: 'right',
        bottom: 'bottom',
        left: 'left',
        'inline-end': isRtl ? 'left' : 'right',
        'inline-start': isRtl ? 'right' : 'left',
      } satisfies Record<Side, PhysicalSide>
    )[sideParam];

  const placement = align === 'center' ? side : (`${side}-${align}` as Placement);

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
  // popup.
  const arrowRef = {current: null as Element | null};

  const sideOffsetRef = {current: sideOffset};
  const alignOffsetRef = {current: alignOffset};
  const sideOffsetDep = typeof sideOffset !== 'function' ? sideOffset : 0;
  const alignOffsetDep = typeof alignOffset !== 'function' ? alignOffset : 0;

  const middleware: Array<Middleware> = [];

  if (inlineMiddleware) {
    middleware.push(inlineMiddleware);
  }

  middleware.push(
    offset((state: any) => {
      const data = getOffsetData(state, sideParam, isRtl);

      const sideAxis =
        typeof sideOffsetRef.current === 'function'
          ? (sideOffsetRef.current as any)(data)
          : sideOffsetRef.current;
      const alignAxis =
        typeof alignOffsetRef.current === 'function'
          ? (alignOffsetRef.current as any)(data)
          : alignOffsetRef.current;

      return {
        mainAxis: sideAxis,
        crossAxis: alignAxis,
        alignmentAxis: alignAxis,
      };
    }) as any,
  );

  const shiftDisabled = collisionAvoidanceAlign === 'none' && collisionAvoidanceSide !== 'shift';
  const crossAxisShiftEnabled =
    !shiftDisabled && (sticky || shiftCrossAxis || collisionAvoidanceSide === 'shift');

  const flipMiddleware =
    collisionAvoidanceSide === 'none'
      ? null
      : flip({
          ...commonCollisionProps,
          padding: {
            top: collisionPadding.top + bias + biasTop,
            right: collisionPadding.right + bias + biasRight,
            bottom: collisionPadding.bottom + bias + biasBottom,
            left: collisionPadding.left + bias + biasLeft,
          },
          mainAxis: !shiftCrossAxis && collisionAvoidanceSide === 'flip',
          crossAxis: collisionAvoidanceAlign === 'flip' ? 'alignment' : false,
          fallbackAxisSideDirection: collisionAvoidanceFallbackAxisSide,
        } as any);
  const shiftMiddleware = shiftDisabled
    ? null
    : floatingShift({
        ...commonCollisionProps,
        rootBoundary: shiftRootBoundary,
        mainAxis: collisionAvoidanceAlign !== 'none',
        crossAxis: crossAxisShiftEnabled,
        limiter:
          sticky || shiftCrossAxis
            ? undefined
            : limitShift((limitData: any) => {
                if (!arrowRef.current) {
                  return {};
                }
                const {width, height} = arrowRef.current.getBoundingClientRect();
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
      } as any);

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
      apply({elements: {floating}, availableWidth, availableHeight, rects}: any) {
        if (!mountedRef.current) {
          return;
        }

        const floatingStyle = floating.style;
        floatingStyle.setProperty(AVAILABLE_WIDTH_VAR, `${availableWidth}px`);
        floatingStyle.setProperty(AVAILABLE_HEIGHT_VAR, `${availableHeight}px`);

        // Snap anchor dimensions to device pixels.
        const dpr = ownerWindow(floating).devicePixelRatio || 1;
        const {x, y, width, height} = rects.reference;
        const anchorWidth = (Math.round((x + width) * dpr) - Math.round(x * dpr)) / dpr;
        const anchorHeight = (Math.round((y + height) * dpr) - Math.round(y * dpr)) / dpr;

        floatingStyle.setProperty('--anchor-width', `${anchorWidth}px`);
        floatingStyle.setProperty('--anchor-height', `${anchorHeight}px`);
      },
    } as any),
    arrow((state: any) => ({
      // `transform-origin` calculations rely on an element existing.
      element: arrowRef.current || ownerDocument(state.elements.floating).createElement('div'),
      padding: arrowPadding,
      offsetParent: 'floating',
    }) as any),
    {
      name: 'transformOrigin',
      fn(state: any) {
        const {elements, middlewareData, placement: renderedPlacement, rects, y} = state;

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
            ? (sideOffset as any)(getOffsetData(state, sideParam, isRtl))
            : sideOffset;
        const isOverlappingAnchor = shiftY > sideOffsetValue;

        const adjacentTransformOrigin = {
          top: `${transformX}px calc(100% + ${sideOffsetValue}px)`,
          bottom: `${transformX}px ${-sideOffsetValue}px`,
          left: `calc(100% + ${sideOffsetValue}px) ${transformY}px`,
          right: `${-sideOffsetValue}px ${transformY}px`,
        }[currentRenderedSide];
        const overlapTransformOrigin = `${transformX}px ${
          rects.reference.y + halfAnchorHeight - y
        }px`;

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

  watch(
    () => [mountedValue, floatingRootContext] as const,
    () => {
      // Ensure positioning doesn't run initially for `keepMounted` elements that
      // aren't initially open.
      if (!mountedValue && floatingRootContext) {
        floatingRootContext.update({
          referenceElement: null,
          floatingElement: null,
          domReferenceElement: null,
          positionReference: null,
        });
      }
    },
    {flush: 'post', immediate: true},
  );

  const autoUpdateOptions = {
    elementResize: !disableAnchorTracking && typeof ResizeObserver !== 'undefined',
    layoutShift: !disableAnchorTracking && typeof IntersectionObserver !== 'undefined',
  };

  const floating = useBaseUIFloating({
    rootContext: floatingRootContext,
    open: keepMounted ? mounted : undefined,
    placement,
    middleware: middleware as any,
    strategy: positionMethod,
    whileElementsMounted: keepMounted
      ? undefined
      : ((...args: any[]) => autoUpdate(...(args as [any, any, () => void]) , autoUpdateOptions)) as any,
    nodeId,
    externalTree,
  } as any) as any;

  const {x, y, middlewareData, isPositioned, context, update, refs, elements} = floating;

  const renderedPlacement = floating.placement;
  const originalFloatingStyles = floating.floatingStyles;

  const {sideX, sideY} = middlewareData.value.adaptiveOrigin || DEFAULT_SIDES;

  // Default to `fixed` when not positioned to prevent `autoFocus` scroll jumps.
  const resolvedPosition: 'absolute' | 'fixed' = isPositioned.value
    ? positionMethod
    : 'fixed';

  const floatingStyles = computed(() => {
    let base: Record<string, any>;
    if (!isPositioned.value) {
      // Until a position for the current open is computed, ignore any coordinates retained from a
      // previous open.
      base = {position: resolvedPosition, top: 0, left: 0};
    } else if (adaptiveOrigin) {
      base = {position: resolvedPosition, [sideX]: x.value, [sideY]: y.value};
    } else {
      base = {...originalFloatingStyles.value, position: resolvedPosition};
    }

    // Seed the available size vars so consumer `max-height: min(x, var(--available-height))` rules
    // resolve to a valid length on the first positioning pass.
    base[AVAILABLE_WIDTH_VAR] = '100vw';
    base[AVAILABLE_HEIGHT_VAR] = '100vh';

    if (!isPositioned.value) {
      base.opacity = 0;
    }
    return base;
  });

  const registeredPositionReferenceRef = {current: null as Element | VirtualElement | null};

  watch(
    () => [mountedValue, refs] as const,
    () => {
      if (!mountedValue) {
        return;
      }

      const anchorValue = anchorValueRef.current;
      const resolvedAnchor = typeof anchorValue === 'function' ? (anchorValue as any)() : anchorValue;
      const unwrappedElement =
        (isRef(resolvedAnchor)
          ? ((resolvedAnchor as any).current ?? (resolvedAnchor as any).value)
          : resolvedAnchor) || null;
      const finalAnchor = unwrappedElement || null;

      if (finalAnchor !== registeredPositionReferenceRef.current) {
        refs.setPositionReference(finalAnchor);
        registeredPositionReferenceRef.current = finalAnchor;
      }
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [mountedValue, refs] as const,
    () => {
      if (!mountedValue) {
        return;
      }

      const anchorValue = anchorValueRef.current;

      // Refs from parent components are set after layout effects run and are available later.
      if (typeof anchorValue === 'function') {
        return;
      }

      if (isRef(anchorValue) && anchorValue.current !== registeredPositionReferenceRef.current) {
        refs.setPositionReference(anchorValue.current);
        registeredPositionReferenceRef.current = anchorValue.current;
      }
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [keepMounted, mountedValue, elements] as const,
    () => {
      if (keepMounted && mountedValue && elements.reference?.value && elements.floating?.value) {
        return autoUpdate(
          elements.reference.value as any,
          elements.floating.value as any,
          update,
          autoUpdateOptions,
        );
      }
      return undefined;
    },
    {flush: 'post', immediate: true},
  );

  const renderedSide = getSide(renderedPlacement.value);
  const logicalRenderedSide = getLogicalSide(sideParam, renderedSide, isRtl);
  const renderedAlign = getAlignment(renderedPlacement.value) || 'center';
  const anchorHidden = Boolean(middlewareData.value.hide?.referenceHidden);

  // Locks the flip (makes it "sticky") so it doesn't prefer a given placement
  // and flips back lazily, not eagerly.
  watch(
    () => [lazyFlip, mountedValue, isPositioned.value, renderedSide, side] as const,
    () => {
      if (lazyFlip && mountedValue && isPositioned.value && renderedSide !== side) {
        mountSide.value = renderedSide;
      }
    },
    {flush: 'post', immediate: true},
  );

  const arrowStyles = computed(() => ({
    position: 'absolute' as const,
    top: middlewareData.value.arrow?.y,
    left: middlewareData.value.arrow?.x,
  }));

  const arrowUncentered = middlewareData.value.arrow?.centerOffset !== 0;

  return {
    positionerStyles: floatingStyles,
    arrowStyles,
    arrowRef,
    arrowUncentered,
    side: logicalRenderedSide,
    align: renderedAlign,
    physicalSide: renderedSide,
    anchorHidden,
    refs,
    context,
    isPositioned: isPositioned.value,
    update,
  } as unknown as UseAnchorPositioningReturnValue;
}

function isRef(param: any): param is {current: any} | {value: any} {
  return param != null && ('current' in param || 'value' in param);
}

export interface UseAnchorPositioningSharedParameters {
  /**
   * An element to position the popup against.
   */
  anchor?:
    | Element
    | null
    | VirtualElement
    | {current: Element | null}
    | (() => Element | VirtualElement | null)
    | undefined;
  /**
   * Determines which CSS `position` property to use.
   * @default 'absolute'
   */
  positionMethod?: 'absolute' | 'fixed' | undefined;
  /**
   * Which side of the anchor element to align the popup against.
   * @default 'bottom'
   */
  side?: Side | undefined;
  /**
   * Distance between the anchor and the popup in pixels.
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
  collisionPadding?: any | undefined;
  /**
   * Whether to maintain the popup in the viewport after the anchor scrolled out of view.
   * @default false
   */
  sticky?: boolean | undefined;
  /**
   * Minimum distance to maintain between the arrow and the edges of the popup.
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
   */
  collisionAvoidance?: CollisionAvoidance | undefined;
}

export interface UseAnchorPositioningParameters extends UseAnchorPositioningSharedParameters {
  keepMounted?: boolean | undefined;
  floatingRootContext?: FloatingRootStore | undefined;
  mounted: boolean | ComputedRef<boolean>;
  disableAnchorTracking: boolean;
  nodeId?: string | undefined;
  adaptiveOrigin?: Middleware | undefined;
  collisionAvoidance: CollisionAvoidance;
  shift?:
    | {
        crossAxis?: boolean | undefined;
        rootBoundary?: 'layoutViewport' | undefined;
      }
    | undefined;
  lazyFlip?: boolean | undefined;
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Optional middleware that can replace the measured reference rect before offsets and collision
   * middleware run.
   */
  inline?: Middleware | undefined;
}

export interface UseAnchorPositioningReturnValue {
  positionerStyles: any;
  arrowStyles: any;
  arrowRef: {current: Element | null};
  arrowUncentered: boolean;
  side: Side;
  align: Align;
  physicalSide: PhysicalSide;
  anchorHidden: boolean;
  refs: any;
  context: any;
  isPositioned: boolean;
  update: () => void;
}

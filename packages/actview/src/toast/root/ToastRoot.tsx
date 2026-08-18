import { computed, onUnmounted, ref, watch } from 'actview';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import { activeElement, contains, getTarget } from '../../floating-ui-actview/utils';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { ToastObject as ToastObjectType } from '../useToastManager';
import { ToastRootContext } from './ToastRootContext';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import {
  BASE_UI_SWIPE_IGNORE_SELECTOR,
  LEGACY_SWIPE_IGNORE_SELECTOR,
} from '../../internals/constants';
import { getDisplacement } from '../../utils/useSwipeDismiss';
import { getElementTransform } from '../../utils/getElementTransform';

export const toastRootStateAttributesMapping: StateAttributesMapping<ToastRootState> = {
  ...transitionStatusMapping,
  swipeDirection(value) {
    return value ? { 'data-swipe-direction': value } : null;
  },
};

const SWIPE_THRESHOLD = 40;
const REVERSE_CANCEL_THRESHOLD = 10;
const OPPOSITE_DIRECTION_DAMPING_FACTOR = 0.5;
const MIN_DRAG_THRESHOLD = 1;
const TOAST_SWIPE_IGNORE_SELECTOR = `${BASE_UI_SWIPE_IGNORE_SELECTOR},${LEGACY_SWIPE_IGNORE_SELECTOR}`;

/**
 * Groups all parts of an individual toast.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastRoot(componentProps: ToastRoot.Props) {
  const {
    toast: _toast,
    render: _render,
    className: _className,
    style: _style,
    ..._rest
  } = componentProps;

  // `toast` is a reactive prop (the store swaps in new toast objects on every
  // update/close), so it must be read through a computed — never destructured in
  // setup, which would freeze a snapshot (PD-15).
  const toast = computed(() => componentProps.toast);
  const swipeDirection = computed<Exclude<ToastRoot.Props['swipeDirection'], undefined>>(
    () => componentProps.swipeDirection ?? ['down', 'right'],
  );

  const isAnchored = computed(() => toast.value.positionerProps?.anchor !== undefined);

  const swipeDirections = computed<('up' | 'down' | 'left' | 'right')[]>(() => {
    if (isAnchored.value) {
      return [];
    }
    return Array.isArray(swipeDirection.value) ? swipeDirection.value : [swipeDirection.value];
  });

  const swipeEnabled = computed(() => swipeDirections.value.length > 0);

  const store = useToastProviderContext().value!;

  const currentSwipeDirection = ref<'up' | 'down' | 'left' | 'right' | undefined>(undefined);
  const isSwiping = ref(false);
  const isRealSwipe = ref(false);
  const dragOffset = ref({ x: 0, y: 0 });
  const initialTransform = ref({ x: 0, y: 0, scale: 1 });
  const titleId = ref<string | undefined>(undefined);
  const descriptionId = ref<string | undefined>(undefined);
  const lockedDirection = ref<'horizontal' | 'vertical' | null>(null);

  const rootRef = ref<HTMLDivElement | null>(null);
  const lastToastIdRef = { current: undefined as string | undefined };
  const dragStartPosRef = { current: { x: 0, y: 0 } };
  const initialTransformRef = { current: { x: 0, y: 0, scale: 1 } };
  const intendedSwipeDirectionRef = { current: undefined as 'up' | 'down' | 'left' | 'right' | undefined };
  const maxSwipeDisplacementRef = { current: 0 };
  const cancelledSwipeRef = { current: false };
  const swipeCancelBaselineRef = { current: { x: 0, y: 0 } };
  const isFirstPointerMoveRef = { current: false };
  const dragOffsetRef = { current: { x: 0, y: 0 } };
  const activePointerIdRef = { current: null as number | null };
  const dragAbortControllerRef = { current: null as AbortController | null };

  const domIndex = store.useState('toastIndex', toast.value.id);
  const visibleIndex = store.useState('toastVisibleIndex', toast.value.id);
  const offsetY = store.useState('toastOffsetY', toast.value.id);
  const focused = store.useState('focused');
  const expanded = store.useState('expanded');

  useOpenChangeComplete({
    open: computed(() => toast.value.transitionStatus !== 'ending'),
    ref: rootRef,
    onComplete() {
      if (toast.value.transitionStatus === 'ending') {
        store.removeToast(toast.value.id);
      }
    },
  });

  // Recalculates the natural height of the toast and updates it in the toast manager.
  // The store ignores this write while the toast is transitioning out.
  // (The React version passes `flushSync` from observer callbacks; ActView's store
  // updates are already synchronous, so the flag is unused here.)
  const recalculateHeight = (flushSync: boolean = false) => {
    const element = rootRef.value;
    if (!element) {
      return;
    }

    const previousHeight = element.style.height;
    element.style.height = 'auto';

    const height = element.offsetHeight;

    element.style.height = previousHeight;

    store.updateToastInternal(toast.value.id, {
      ref: rootRef,
      height,
      transitionStatus: undefined,
    });
  };

  // Initialize the toast on mount, and reinitialize when it begins a new lifecycle:
  // re-adding an ending toast retains the same root instance (`key={toast.id}`), and
  // index-keyed lists can hand an existing instance a different toast.
  watch(
    [() => rootRef.value, () => toast.value.transitionStatus, () => toast.value.id],
    (_values, _old, onCleanup) => {
      const status = toast.value.transitionStatus;
      const id = toast.value.id;
      const previousToastId = lastToastIdRef.current;
      // `recalculateHeight` clears the `starting` status itself, so bail out on the
      // resulting re-run and on the later `ending` one, which the store discards anyway.
      if (status !== 'starting' && previousToastId === id) {
        return;
      }

      if (previousToastId !== undefined) {
        // A retained root keeps component-local swipe state from its previous lifecycle;
        // clear it so the toast doesn't stay offset or exit in the swiped direction.
        currentSwipeDirection.value = undefined;
        initialTransform.value = { x: 0, y: 0, scale: 1 };
        setResolvedDragOffset({ x: 0, y: 0 });
      }

      lastToastIdRef.current = id;
      recalculateHeight();
    },
    { immediate: true },
  );

  function setResolvedDragOffset(nextDragOffset: { x: number; y: number }) {
    dragOffsetRef.current = nextDragOffset;
    dragOffset.value = nextDragOffset;
  }

  onUnmounted(() => {
    dragAbortControllerRef.current?.abort();
  });

  function applyDirectionalDamping(deltaX: number, deltaY: number) {
    const damp = (delta: number) =>
      delta > 0
        ? delta ** OPPOSITE_DIRECTION_DAMPING_FACTOR
        : -(Math.abs(delta) ** OPPOSITE_DIRECTION_DAMPING_FACTOR);

    const dampX =
      (deltaX > 0 && !swipeDirections.value.includes('right')) ||
      (deltaX < 0 && !swipeDirections.value.includes('left'));
    const dampY =
      (deltaY > 0 && !swipeDirections.value.includes('down')) ||
      (deltaY < 0 && !swipeDirections.value.includes('up'));

    return {
      x: dampX ? damp(deltaX) : deltaX,
      y: dampY ? damp(deltaY) : deltaY,
    };
  }

  function handleSwipeEnd(event: PointerEvent) {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    activePointerIdRef.current = null;
    dragAbortControllerRef.current?.abort();
    dragAbortControllerRef.current = null;
    isSwiping.value = false;
    isRealSwipe.value = false;
    lockedDirection.value = null;

    const resolvedInitialTransform = initialTransformRef.current;

    if (event.type === 'pointercancel' || cancelledSwipeRef.current) {
      setResolvedDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
      currentSwipeDirection.value = undefined;
      return;
    }

    const resolvedDragOffset = dragOffsetRef.current;
    const deltaX = resolvedDragOffset.x - resolvedInitialTransform.x;
    const deltaY = resolvedDragOffset.y - resolvedInitialTransform.y;
    let dismissDirection: 'up' | 'down' | 'left' | 'right' | undefined;

    for (const direction of swipeDirections.value) {
      if (getDisplacement(direction, deltaX, deltaY) > SWIPE_THRESHOLD) {
        dismissDirection = direction;
        break;
      }
    }

    if (dismissDirection) {
      currentSwipeDirection.value = dismissDirection;
      store.closeToast(toast.value.id);
    } else {
      setResolvedDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
      currentSwipeDirection.value = undefined;
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    if (event.pointerType === 'touch') {
      store.pauseTimers();
    }

    const target = getTarget(event) as HTMLElement | null;

    const isInteractiveElement = target?.closest(
      `button,a,input,textarea,[role="button"],${TOAST_SWIPE_IGNORE_SELECTOR}`,
    );

    if (isInteractiveElement) {
      return;
    }

    cancelledSwipeRef.current = false;
    intendedSwipeDirectionRef.current = undefined;
    maxSwipeDisplacementRef.current = 0;
    activePointerIdRef.current = event.pointerId;
    dragStartPosRef.current = { x: event.clientX, y: event.clientY };
    swipeCancelBaselineRef.current = dragStartPosRef.current;

    const element = event.currentTarget as HTMLElement;

    const transform = getElementTransform(element);
    initialTransformRef.current = transform;
    initialTransform.value = transform;
    setResolvedDragOffset({
      x: transform.x,
      y: transform.y,
    });

    store.set('hovering', true);
    isSwiping.value = true;
    isRealSwipe.value = false;
    lockedDirection.value = null;
    isFirstPointerMoveRef.current = true;

    dragAbortControllerRef.current?.abort();
    const dragAbortController = new AbortController();
    dragAbortControllerRef.current = dragAbortController;

    const doc = ownerDocument(element);
    doc.addEventListener('pointerup', handleSwipeEnd, { signal: dragAbortController.signal });
    doc.addEventListener('pointercancel', handleSwipeEnd, { signal: dragAbortController.signal });

    element.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    // Prevent text selection on Safari
    event.preventDefault();

    if (isFirstPointerMoveRef.current) {
      // Adjust the starting position to the current position on the first move
      // to account for the delay between pointerdown and the first pointermove on iOS.
      dragStartPosRef.current = { x: event.clientX, y: event.clientY };
      isFirstPointerMoveRef.current = false;
    }

    const { clientY, clientX, movementX, movementY } = event;

    if (
      (movementY < 0 && clientY > swipeCancelBaselineRef.current.y) ||
      (movementY > 0 && clientY < swipeCancelBaselineRef.current.y)
    ) {
      swipeCancelBaselineRef.current = { x: swipeCancelBaselineRef.current.x, y: clientY };
    }

    if (
      (movementX < 0 && clientX > swipeCancelBaselineRef.current.x) ||
      (movementX > 0 && clientX < swipeCancelBaselineRef.current.x)
    ) {
      swipeCancelBaselineRef.current = { x: clientX, y: swipeCancelBaselineRef.current.y };
    }

    const deltaX = clientX - dragStartPosRef.current.x;
    const deltaY = clientY - dragStartPosRef.current.y;
    const cancelDeltaY = clientY - swipeCancelBaselineRef.current.y;
    const cancelDeltaX = clientX - swipeCancelBaselineRef.current.x;

    let resolvedLockedDirection = lockedDirection.value;

    if (!isRealSwipe.value) {
      const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (movementDistance >= MIN_DRAG_THRESHOLD) {
        isRealSwipe.value = true;
        // `lockedDirection` is always reset alongside `isRealSwipe`, so it is
        // still `null` here. Locking is only meaningful when both axes are
        // swipeable; otherwise the single axis already constrains the gesture.
        const hasHorizontal = swipeDirections.value.includes('left') || swipeDirections.value.includes('right');
        const hasVertical = swipeDirections.value.includes('up') || swipeDirections.value.includes('down');
        if (hasHorizontal && hasVertical) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          resolvedLockedDirection = absX > absY ? 'horizontal' : 'vertical';
          lockedDirection.value = resolvedLockedDirection;
        }
      }
    }

    let candidate: 'up' | 'down' | 'left' | 'right' | undefined;
    if (!intendedSwipeDirectionRef.current) {
      if (resolvedLockedDirection === 'vertical') {
        if (deltaY > 0) {
          candidate = 'down';
        } else if (deltaY < 0) {
          candidate = 'up';
        }
      } else if (resolvedLockedDirection === 'horizontal') {
        if (deltaX > 0) {
          candidate = 'right';
        } else if (deltaX < 0) {
          candidate = 'left';
        }
      } else if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        candidate = deltaX > 0 ? 'right' : 'left';
      } else {
        candidate = deltaY > 0 ? 'down' : 'up';
      }

      if (candidate && swipeDirections.value.includes(candidate)) {
        intendedSwipeDirectionRef.current = candidate;
        maxSwipeDisplacementRef.current = getDisplacement(candidate, deltaX, deltaY);
        currentSwipeDirection.value = candidate;
      }
    } else {
      const direction = intendedSwipeDirectionRef.current;
      const currentDisplacement = getDisplacement(direction, cancelDeltaX, cancelDeltaY);

      if (currentDisplacement > SWIPE_THRESHOLD) {
        cancelledSwipeRef.current = false;
        currentSwipeDirection.value = direction;
      } else if (
        !(swipeDirections.value.includes('left') && swipeDirections.value.includes('right')) &&
        !(swipeDirections.value.includes('up') && swipeDirections.value.includes('down')) &&
        maxSwipeDisplacementRef.current - currentDisplacement >= REVERSE_CANCEL_THRESHOLD
      ) {
        // Mark that a change-of-mind has occurred
        cancelledSwipeRef.current = true;
      }
    }

    const dampedDelta = applyDirectionalDamping(deltaX, deltaY);
    let newOffsetX = initialTransformRef.current.x;
    let newOffsetY = initialTransformRef.current.y;

    const hasHorizontalDir = swipeDirections.value.includes('left') || swipeDirections.value.includes('right');
    const hasVerticalDir = swipeDirections.value.includes('up') || swipeDirections.value.includes('down');

    if (resolvedLockedDirection !== 'vertical' && hasHorizontalDir) {
      newOffsetX += dampedDelta.x;
    }

    if (resolvedLockedDirection !== 'horizontal' && hasVerticalDir) {
      newOffsetY += dampedDelta.y;
    }

    setResolvedDragOffset({ x: newOffsetX, y: newOffsetY });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (
        !rootRef.value ||
        !contains(rootRef.value, activeElement(ownerDocument(rootRef.value)))
      ) {
        return;
      }

      store.closeToast(toast.value.id);
    }
  }

  // React's pointermove preventDefault is not enough on iOS; this non-passive
  // touchmove listener blocks native scrolling while dragging.
  watch(
    [() => rootRef.value, () => swipeEnabled.value],
    (_values, _old, onCleanup) => {
      const element = rootRef.value;
      if (!swipeEnabled.value || !element) {
        return;
      }

      function preventDefaultTouchStart(event: TouchEvent) {
        if (
          activePointerIdRef.current === null ||
          !contains(element, getTarget(event) as HTMLElement | null)
        ) {
          return;
        }

        event.preventDefault();
      }

      const cleanup = addEventListener(element, 'touchmove', preventDefaultTouchStart, {
        passive: false,
      });

      onCleanup(() => {
        cleanup();
      });
    },
    { immediate: true },
  );

  function getDragStyles() {
    const deltaX = dragOffset.value.x - initialTransform.value.x;
    const deltaY = dragOffset.value.y - initialTransform.value.y;

    const styles: Record<string, string | number> = {
      '--toast-swipe-movement-x': `${deltaX}px`,
      '--toast-swipe-movement-y': `${deltaY}px`,
    };

    if (isSwiping.value) {
      // While swiping, freeze the element at its current visual transform so it doesn't
      // snap to the end position.
      styles.transition = 'none';
      styles.transform = `translateX(${dragOffset.value.x}px) translateY(${dragOffset.value.y}px) scale(${initialTransform.value.scale})`;
    }

    return styles;
  }

  const isHighPriority = computed(() => toast.value.priority === 'high');

  // The remaining element props (including `children`) must be re-read from
  // `componentProps` on every render — a setup-time spread would freeze a snapshot
  // of the children VNode and never reflect store updates (PD-15).
  const getElementProps = (prev: any): HTMLProps => {
    const {
      toast: _toast,
      render: _render,
      className: _className,
      style: _style,
      ...rest
    } = componentProps;
    return { ...prev, ...rest };
  };

  // Evaluated on every render: all of these read reactive store/ref values.
  const getDefaultProps = (): HTMLProps => ({
    role: isHighPriority.value ? 'alertdialog' : 'dialog',
    tabIndex: 0,
    'aria-modal': false,
    'aria-labelledby': titleId.value,
    'aria-describedby': descriptionId.value,
    'aria-hidden': isHighPriority.value && !focused.value ? true : undefined,
    onPointerDown: swipeEnabled.value ? handlePointerDown : undefined,
    onPointerMove: swipeEnabled.value ? handlePointerMove : undefined,
    onPointerUp: swipeEnabled.value ? handleSwipeEnd : undefined,
    onPointerCancel: swipeEnabled.value ? handleSwipeEnd : undefined,
    onKeyDown: handleKeyDown,
    inert: inertValue(toast.value.limited),
    style: {
      ...getDragStyles(),
      '--toast-index':
        toast.value.transitionStatus === 'ending' ? domIndex.value : visibleIndex.value,
      '--toast-offset-y': `${offsetY.value}px`,
      '--toast-height': toast.value.height ? `${toast.value.height}px` : undefined,
    } as Record<string, string | number>,
  });

  const contextValue = computed<ToastRootContext>(() => ({
    toast: toast.value,
    setTitleId,
    setDescriptionId,
    recalculateHeight,
    visibleIndex: visibleIndex.value,
    expanded: expanded.value,
  }));

  function setTitleId(next: string | undefined | ((current: string | undefined) => string | undefined)) {
    titleId.value =
      typeof next === 'function'
        ? (next as (current: string | undefined) => string | undefined)(titleId.value)
        : next;
  }

  function setDescriptionId(next: string | undefined | ((current: string | undefined) => string | undefined)) {
    descriptionId.value =
      typeof next === 'function'
        ? (next as (current: string | undefined) => string | undefined)(descriptionId.value)
        : next;
  }

  const state = computed<ToastRootState>(() => ({
    transitionStatus: toast.value.transitionStatus,
    expanded: expanded.value,
    limited: toast.value.limited || false,
    type: toast.value.type,
    swiping: isSwiping.value,
    swipeDirection: currentSwipeDirection.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, rootRef],
    state,
    stateAttributesMapping: toastRootStateAttributesMapping,
    props: [getDefaultProps, getElementProps],
  });

  return <ToastRootContext.Provider value={contextValue}>{getElement()}</ToastRootContext.Provider>;
}

export type ToastRootToastObject<Data extends object = any> = ToastObjectType<Data>;

export interface ToastRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether the toasts in the viewport are expanded.
   */
  expanded: boolean;
  /**
   * Whether the toast was limited because the toast limit was exceeded.
   */
  limited: boolean;
  /**
   * The type of the toast.
   */
  type: string | undefined;
  /**
   * Whether the toast is being swiped.
   */
  swiping: boolean;
  /**
   * The direction the toast is being swiped.
   */
  swipeDirection: 'up' | 'down' | 'left' | 'right' | undefined;
}

export interface ToastRootProps extends BaseUIComponentProps<'div', ToastRootState> {
  /**
   * The toast to render.
   */
  toast: ToastRootToastObject<any>;
  /**
   * Direction(s) in which the toast can be swiped to dismiss.
   * @default ['down', 'right']
   */
  swipeDirection?:
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | ('up' | 'down' | 'left' | 'right')[]
    | undefined;
}

export namespace ToastRoot {
  export type ToastObject<Data extends object = any> = ToastRootToastObject<Data>;
  export type State = ToastRootState;
  export type Props = ToastRootProps;
}

import { onUnmounted } from 'actview';
import { addEventListener } from '@/utils/addEventListener';
import { NOOP } from '@/internals/noop';
import { useTimeout } from '@/utils/useTimeout';
import { useInterval } from '@/utils/useInterval';
import { ownerWindow } from '@/utils/owner';

const DEFAULT_TICK_DELAY = 60;
const DEFAULT_START_DELAY = 400;
const DEFAULT_SCROLL_DISTANCE = 8;
const TOUCH_TIMEOUT = 50;
const MAX_POINTER_MOVES_AFTER_TOUCH = 3;

// Treat pen as touch-like to avoid forcing the software keyboard on stylus taps.
// Linux Chrome may emit "pen" historically for mouse usage due to a bug, but the touch path
// still works with minor behavioral differences.
export function isTouchLikePointerType(pointerType: string) {
  return pointerType === 'touch' || pointerType === 'pen';
}

export interface UsePressAndHoldParameters {
  disabled: boolean;
  /**
   * Called on each tick during a hold. Return `false` to stop the auto-change sequence.
   */
  tick: (triggerEvent?: Event) => boolean;
  /**
   * Called when the hold ends via the global `pointerup` event.
   */
  onStop?: ((nativeEvent: PointerEvent) => void) | undefined;
  /**
   * Interval between ticks once the hold is active.
   * @default 60
   */
  tickDelay?: number | undefined;
  /**
   * Delay before the repeating ticks start after the initial hold.
   * @default 400
   */
  startDelay?: number | undefined;
  /**
   * Pointer movement distance (px) that cancels the hold and is treated as scrolling.
   * @default 8
   */
  scrollDistance?: number | undefined;
  /**
   * Ref to the anchor element used to resolve `ownerWindow`.
   */
  elementRef: {current: HTMLElement | null};
}

export interface UsePressAndHoldReturnValue {
  pointerHandlers: {
    onTouchStart: (event: any) => void;
    onTouchEnd: (event: any) => void;
    onPointerDown: (event: any) => void;
    onPointerUp: (event: any) => void;
    onPointerMove: (event: any) => void;
    onMouseEnter: (event: any) => void;
    onMouseLeave: (event: any) => void;
    onMouseUp: (event: any) => void;
  };
  /**
   * Returns `true` if the `onClick` handler should be skipped.
   */
  shouldSkipClick: (event: any) => boolean;
}

/**
 * Adds press-and-hold behavior to a button element.
 * On pointer down, performs one action immediately, then after a delay starts
 * continuous repeated actions at a fixed interval. Handles mouse, touch, and pen
 * inputs correctly, including Android-specific quirks.
 * (actview 转译版：React 的 useStableCallback → 稳定闭包；useEffect 清理 → onUnmounted。)
 */
export function usePressAndHold(params: UsePressAndHoldParameters): UsePressAndHoldReturnValue {
  const {
    disabled,
    tick,
    onStop,
    tickDelay = DEFAULT_TICK_DELAY,
    startDelay = DEFAULT_START_DELAY,
    scrollDistance = DEFAULT_SCROLL_DISTANCE,
    elementRef,
  } = params;

  const startTickTimeout = useTimeout();
  const tickInterval = useInterval();
  const intentionalTouchCheckTimeout = useTimeout();

  const isPressedRef = {current: false};
  const movesAfterTouchRef = {current: 0};
  const downCoordsRef = {current: {x: 0, y: 0}};
  const isTouchingButtonRef = {current: false};
  const ignoreClickRef = {current: false};
  const pointerTypeRef = {current: ''};
  const unsubscribeFromGlobalContextMenuRef = {current: NOOP as () => void};
  const unsubscribeFromGlobalPointerUpRef = {current: NOOP as () => void};

  const stopAutoChange = () => {
    intentionalTouchCheckTimeout.clear();
    startTickTimeout.clear();
    tickInterval.clear();
    unsubscribeFromGlobalContextMenuRef.current();
    movesAfterTouchRef.current = 0;
  };

  function startAutoChange(triggerNativeEvent?: Event) {
    stopAutoChange();

    const element = elementRef.current;
    if (!element) {
      return;
    }

    const win = ownerWindow(element);

    function handleContextMenu(event: Event) {
      event.preventDefault();
    }

    // A global context menu listener is necessary to prevent the context menu from
    // appearing when the touch is slightly outside of the element's hit area.
    unsubscribeFromGlobalContextMenuRef.current = addEventListener(
      win,
      'contextmenu',
      handleContextMenu,
    );

    // The release listener stays registered through `stopAutoChange` so a hold that auto-stops at
    // a boundary (a repeat tick returning `false`) still fires `onStop` on release. Replace any
    // existing one first so a mouseleave/mouseenter cycle during a hold doesn't stack listeners.
    unsubscribeFromGlobalPointerUpRef.current();
    unsubscribeFromGlobalPointerUpRef.current = addEventListener(
      win,
      'pointerup',
      (event) => {
        isPressedRef.current = false;
        stopAutoChange();
        onStop?.(event as PointerEvent);
      },
      {once: true},
    );

    if (!tick(triggerNativeEvent)) {
      stopAutoChange();
      return;
    }

    startTickTimeout.start(startDelay, () => {
      tickInterval.start(tickDelay, () => {
        if (!tick(triggerNativeEvent)) {
          stopAutoChange();
        }
      });
    });
  }

  onUnmounted(() => {
    stopAutoChange();
    unsubscribeFromGlobalPointerUpRef.current();
  });

  if (disabled) {
    isPressedRef.current = false;
    isTouchingButtonRef.current = false;
    pointerTypeRef.current = '';
    stopAutoChange();
  }

  const pointerHandlers: UsePressAndHoldReturnValue['pointerHandlers'] = {
    onTouchStart() {
      isTouchingButtonRef.current = true;
    },
    onTouchEnd() {
      isTouchingButtonRef.current = false;
    },
    onPointerDown(event: any) {
      if (event.defaultPrevented || event.button || disabled) {
        return;
      }

      pointerTypeRef.current = event.pointerType;
      ignoreClickRef.current = false;
      isPressedRef.current = true;
      downCoordsRef.current = {x: event.clientX, y: event.clientY};

      const isTouchPointer = isTouchLikePointerType(event.pointerType);

      if (!isTouchPointer) {
        event.preventDefault();
        startAutoChange(event.nativeEvent);
      } else {
        // Check if the pointerdown was intentional and not the result of a scroll or
        // pinch-zoom. In that case, we don't want to start the auto-change sequence.
        intentionalTouchCheckTimeout.start(TOUCH_TIMEOUT, () => {
          const moves = movesAfterTouchRef.current;
          movesAfterTouchRef.current = 0;
          // Only start auto-change if the touch is still pressed (prevents races
          // with pointerup occurring before the timeout fires on quick taps).
          const stillPressed = isPressedRef.current;
          if (stillPressed && moves < MAX_POINTER_MOVES_AFTER_TOUCH) {
            startAutoChange(event.nativeEvent);
            ignoreClickRef.current = true; // synthesized click after hold should be ignored
          } else {
            // No auto-change (simple tap or scroll gesture), allow the click handler
            // to perform a single action.
            ignoreClickRef.current = false;
            stopAutoChange();
          }
        });
      }
    },
    onPointerUp(event: any) {
      // Ensure we mark the press as released for touch flows even if auto-change never
      // started, so the delayed auto-change check won't start after a quick tap.
      if (isTouchLikePointerType(event.pointerType)) {
        isPressedRef.current = false;
      }
    },
    onPointerMove(event: any) {
      if (disabled || !isTouchLikePointerType(event.pointerType) || !isPressedRef.current) {
        return;
      }

      movesAfterTouchRef.current += 1;

      const {x, y} = downCoordsRef.current;
      const dx = x - event.clientX;
      const dy = y - event.clientY;

      if (dx ** 2 + dy ** 2 > scrollDistance ** 2) {
        stopAutoChange();
      }
    },
    onMouseEnter(event: any) {
      if (
        event.defaultPrevented ||
        disabled ||
        !isPressedRef.current ||
        isTouchingButtonRef.current ||
        isTouchLikePointerType(pointerTypeRef.current)
      ) {
        return;
      }

      startAutoChange(event.nativeEvent);
    },
    onMouseLeave() {
      if (isTouchingButtonRef.current) {
        return;
      }

      stopAutoChange();
    },
    onMouseUp() {
      if (isTouchingButtonRef.current) {
        return;
      }

      stopAutoChange();
    },
  };

  const shouldSkipClick = (event: any): boolean => {
    if (event.defaultPrevented) {
      return true;
    }
    if (isTouchLikePointerType(pointerTypeRef.current)) {
      return ignoreClickRef.current;
    }
    // actview 事件包装可能不提供 detail；undefined 视为 0（首次单击）
    return (event.detail ?? 0) !== 0;
  };

  return {pointerHandlers, shouldSkipClick};
}

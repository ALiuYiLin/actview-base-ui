import {onMounted, onUnmounted, ref, toValue, useRootElement, watch, shallowRef, toRefs, unrefs} from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { NumberFieldScrubAreaContext } from './NumberFieldScrubAreaContext';
import { getViewportRect } from '../utils/getViewportRect';
import { createGenericEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { getTarget } from '@/utils/shadowDom';
import { ownerDocument, ownerWindow } from '@/utils/owner';
import { platform } from '@/utils/platform';
import { addEventListener } from '@/utils/addEventListener';
import { useTimeout } from '@/utils/useTimeout';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

const SCRUB_AREA_STYLE: any = {
  touchAction: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
};

/**
 * An interactive area where the user can click and drag to change the field value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldScrubArea(componentProps: NumberFieldScrubArea.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const direction = toValue(componentProps.direction) ?? 'horizontal';
  const pixelSensitivity = toValue(componentProps.pixelSensitivity) ?? 2;
  const teleportDistance = toValue(componentProps.teleportDistance);

  const rootContext = useNumberFieldRootContext();
  const scrubAreaRef = useRootElement();

  const isScrubbingRef = ref(false);
  const didMoveRef = ref(false);
  const pointerDownTargetRef = ref(null as EventTarget | null);
  const scrubAreaCursorRef = ref(null as HTMLSpanElement | null);
  const virtualCursorCoords = shallowRef({x: 0, y: 0});

  const exitPointerLockTimeout = useTimeout();

  const isTouchInput = ref(false);
  const isPointerLockDenied = ref(false);
  const isScrubbing = ref(false);

  function updateCursorTransform(virtualCursor: HTMLSpanElement, x: number, y: number) {
    // Invert the visual viewport scale so the cursor matches the OS cursor, which doesn't
    // scale with the content on pinch-zoom.
    const scale = ownerWindow(virtualCursor).visualViewport?.scale ?? 1;
    virtualCursor.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 / scale})`;
  }

  const onScrub = ({movementX, movementY}: PointerEvent) => {
    const virtualCursor = scrubAreaCursorRef.value;
    const scrubAreaEl = scrubAreaRef.value;

    if (!virtualCursor || !scrubAreaEl) {
      return;
    }

    const rect = getViewportRect(teleportDistance, scrubAreaEl);

    const coords = virtualCursorCoords.value;

    // Wrap the cursor to the opposite edge when its center crosses a viewport bound.
    const wrap = (coord: number, halfSize: number, low: number, high: number) => {
      if (coord + halfSize < low) {
        return high - halfSize;
      }
      if (coord + halfSize > high) {
        return low - halfSize;
      }
      return coord;
    };

    const newCoords = {
      x: wrap(
        Math.round(coords.x + movementX),
        virtualCursor.offsetWidth / 2,
        rect.left,
        rect.right,
      ),
      y: wrap(
        Math.round(coords.y + movementY),
        virtualCursor.offsetHeight / 2,
        rect.top,
        rect.bottom,
      ),
    };

    virtualCursorCoords.value = newCoords;

    updateCursorTransform(virtualCursor, newCoords.x, newCoords.y);
  };

  const onScrubbingChange = (
    scrubbingValue: boolean,
    {clientX, clientY}: PointerEvent,
  ) => {
    isScrubbing.value = scrubbingValue;
    rootContext.setIsScrubbing(scrubbingValue);

    const virtualCursor = scrubAreaCursorRef.value;
    if (!virtualCursor || !scrubbingValue) {
      return;
    }

    const initialCoords = {
      x: clientX - virtualCursor.offsetWidth / 2,
      y: clientY - virtualCursor.offsetHeight / 2,
    };

    virtualCursorCoords.value = initialCoords;

    updateCursorTransform(virtualCursor, initialCoords.x, initialCoords.y);
  };

  const {
    state,
    inputRef,
    incrementValue,
    allowInputSyncRef,
    getStepAmount,
    onValueCommitted,
    lastChangedValueRef,
    valueRef,
  } = rootContext;
  const {disabled, readOnly} = state;

  // React 版 useEffect：scrubbing 期间全局监听
  let scrubListenersCleanup: (() => void) | undefined;
  const setupScrubListeners = () => {
    scrubListenersCleanup?.();
    scrubListenersCleanup = undefined;

    // Only listen while actively scrubbing; avoids unrelated pointerup events committing.
    if (!inputRef.value || disabled || readOnly || !isScrubbing.value) {
      return;
    }

    let cumulativeDelta = 0;

    function handleScrubPointerUp(event: PointerEvent) {
      function handler() {
        try {
          ownerDocument(scrubAreaRef.value).exitPointerLock();
        } catch {
          // Ignore errors.
        } finally {
          isScrubbingRef.value = false;
          onScrubbingChange(false, event);
          onValueCommitted(
            lastChangedValueRef.value ?? valueRef.value,
            createGenericEventDetails(REASONS.scrub, event),
          );

          // Manually dispatch a click event if no movement happened, since
          // preventDefault on pointerdown prevents the browser click event.
          const pointerDownTarget = pointerDownTargetRef.value;
          const input = inputRef.value;
          if (!didMoveRef.value && pointerDownTarget != null && input) {
            pointerDownTarget.dispatchEvent(
              new (ownerWindow(input).MouseEvent)('click', {
                bubbles: true,
                cancelable: true,
              }),
            );
          }

          didMoveRef.value = false;
          pointerDownTargetRef.value = null;
        }
      }

      if (platform.engine.gecko) {
        // Firefox needs a small delay here when soft-clicking as the pointer
        // lock will not release otherwise.
        exitPointerLockTimeout.start(20, handler);
      } else {
        handler();
      }
    }

    function handleScrubPointerMove(event: PointerEvent) {
      // The effects below can tear down and re-run without unmounting, which
      // clears the ref while `isScrubbing` stays `true` and re-attaches this listener.
      if (!isScrubbingRef.value) {
        return;
      }

      // Prevent text selection.
      event.preventDefault();

      onScrub(event);

      const {movementX, movementY} = event;

      cumulativeDelta += direction === 'vertical' ? movementY : movementX;

      if (Math.abs(cumulativeDelta) >= pixelSensitivity) {
        cumulativeDelta = 0;
        didMoveRef.value = true;
        const dValue = direction === 'vertical' ? -movementY : movementX;
        const stepAmount = getStepAmount(event);
        const rawAmount = dValue * stepAmount;

        if (rawAmount !== 0) {
          allowInputSyncRef.value = true;
          incrementValue(Math.abs(rawAmount), {
            direction: rawAmount >= 0 ? 1 : -1,
            event,
            reason: REASONS.scrub,
          });
        }
      }
    }

    const win = ownerWindow(inputRef.value);
    const cleanupPointerUp = addEventListener(win, 'pointerup', handleScrubPointerUp, true);
    const cleanupPointerMove = addEventListener(win, 'pointermove', handleScrubPointerMove, true);

    scrubListenersCleanup = () => {
      exitPointerLockTimeout.clear();
      cleanupPointerUp();
      cleanupPointerMove();
    };
  };

  // React 版 useEffect deps：isScrubbing 等变化时重挂
  onMounted(() => {
    const stop = watch(
      () => [isScrubbing.value, disabled, readOnly] as const,
      () => setupScrubListeners(),
      {flush: 'post', immediate: true},
    );
    onUnmounted(() => {
      stop();
      scrubListenersCleanup?.();
    });
  });

  // If the scrub area unmounts mid-scrub, release pointer lock and clear the root's scrubbing
  // state so it doesn't stay locked or stuck.
  onUnmounted(() => {
    if (isScrubbingRef.value) {
      isScrubbingRef.value = false;
      rootContext.setIsScrubbing(false);
      try {
        ownerDocument(scrubAreaRef.value).exitPointerLock();
      } catch {
        // Ignore errors.
      }
    }
  });

  // Prevent scrolling using touch input when scrubbing.
  let touchCleanup: (() => void) | undefined;
  onMounted(() => {
    const element = scrubAreaRef.value;
    if (!element || disabled || readOnly) {
      return;
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 1) {
        event.preventDefault();
      }
    }

    touchCleanup = addEventListener(element, 'touchstart', handleTouchStart);
  });
  onUnmounted(() => {
    touchCleanup?.();
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = () => rootContext.state;

  const {element} = useRenderElement({
    props: () => {
      const defaultProps: any = {
        role: 'presentation',
        style: SCRUB_AREA_STYLE,
        async onPointerDown(event: any) {
          if (event.defaultPrevented || readOnly || event.button || disabled) {
            return;
          }

          const isTouch = event.pointerType === 'touch';
          isTouchInput.value = isTouch;

          if (event.pointerType === 'mouse') {
            event.preventDefault();
            inputRef.value?.focus();
          }

          isScrubbingRef.value = true;
          didMoveRef.value = false;
          pointerDownTargetRef.value = getTarget(event.nativeEvent ?? event);
          onScrubbingChange(true, event.nativeEvent ?? event);

          // WebKit causes significant layout shift with the native message, so we can't use it.
          if (!isTouch && !platform.engine.webkit) {
            try {
              // Avoid non-deterministic errors in testing environments.
              await ownerDocument(scrubAreaRef.value).body.requestPointerLock();
              isPointerLockDenied.value = false;
            } catch (error) {
              isPointerLockDenied.value = true;
            } finally {
              // `onScrubbingChange` already wraps its state updates, so re-emit the
              // scrubbing state directly to reflect the resolved pointer-lock result.
              if (isScrubbingRef.value) {
                onScrubbingChange(true, event.nativeEvent ?? event);
              }
            }
          }
        },
      };

      const stateValue = stateFn();
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateValue) : style?.value;

      const merged: any = {};
      Object.assign(
        merged,
        defaultProps,
        {...unrefs(elementProps)},
        resolvedStyle !== undefined ? {style: Object.assign({}, SCRUB_AREA_STYLE, resolvedStyle)} : undefined,
      );
      return [merged];
    },
    state: stateFn,
    stateAttributesMapping: stateAttributesMapping as any,
    className,
    render,
    refs: () => [scrubAreaRef as any],
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <NumberFieldScrubAreaContext.Provider
      value={
        {
          isScrubbing: isScrubbing.value,
          isTouchInput: isTouchInput.value,
          isPointerLockDenied: isPointerLockDenied.value,
          scrubAreaCursorRef,
        } as any
      }
    >
      {element()}
    </NumberFieldScrubAreaContext.Provider>
  );
}

export interface NumberFieldScrubAreaState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaProps
  extends BaseUIComponentProps<'span', NumberFieldScrubAreaState> {
  /**
   * Cursor movement direction in the scrub area.
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical' | undefined;
  /**
   * Determines how many pixels the cursor must move before the value changes.
   * A higher value will make scrubbing less sensitive.
   * @default 2
   */
  pixelSensitivity?: number | undefined;
  /**
   * If specified, determines the distance that the cursor may move from the center
   * of the scrub area before it will loop back around.
   */
  teleportDistance?: number | undefined;
}

export namespace NumberFieldScrubArea {
  export type State = NumberFieldScrubAreaState;
  export type Props = NumberFieldScrubAreaProps;
}

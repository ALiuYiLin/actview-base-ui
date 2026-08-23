import { defineComponent, onMounted, onUnmounted, ref, toValue, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
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
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';

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
export const NumberFieldScrubArea = defineComponent(function (
  componentProps: NumberFieldScrubArea.Props,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const direction = toValue(componentProps.direction) ?? 'horizontal';
  const pixelSensitivity = toValue(componentProps.pixelSensitivity) ?? 2;
  const teleportDistance = toValue(componentProps.teleportDistance);

  const rootContextRef = useNumberFieldRootContext();
  const scrubAreaRef = useRootElement();

  const isScrubbingRef = {current: false};
  const didMoveRef = {current: false};
  const pointerDownTargetRef = {current: null as EventTarget | null};
  const scrubAreaCursorRef = {current: null as HTMLSpanElement | null};
  const virtualCursorCoords = {current: {x: 0, y: 0}};

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
    const virtualCursor = scrubAreaCursorRef.current;
    const scrubAreaEl = scrubAreaRef.value;

    if (!virtualCursor || !scrubAreaEl) {
      return;
    }

    const rect = getViewportRect(teleportDistance, scrubAreaEl);

    const coords = virtualCursorCoords.current;

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

    virtualCursorCoords.current = newCoords;

    updateCursorTransform(virtualCursor, newCoords.x, newCoords.y);
  };

  const onScrubbingChange = (
    scrubbingValue: boolean,
    {clientX, clientY}: PointerEvent,
  ) => {
    isScrubbing.value = scrubbingValue;
    rootContextRef.value.setIsScrubbing(scrubbingValue);

    const virtualCursor = scrubAreaCursorRef.current;
    if (!virtualCursor || !scrubbingValue) {
      return;
    }

    const initialCoords = {
      x: clientX - virtualCursor.offsetWidth / 2,
      y: clientY - virtualCursor.offsetHeight / 2,
    };

    virtualCursorCoords.current = initialCoords;

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
  } = rootContextRef.value;
  const {disabled, readOnly} = state;

  // React 版 useEffect：scrubbing 期间全局监听
  let scrubListenersCleanup: (() => void) | undefined;
  const setupScrubListeners = () => {
    scrubListenersCleanup?.();
    scrubListenersCleanup = undefined;

    // Only listen while actively scrubbing; avoids unrelated pointerup events committing.
    if (!inputRef.current || disabled || readOnly || !isScrubbing.value) {
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
          isScrubbingRef.current = false;
          onScrubbingChange(false, event);
          onValueCommitted(
            lastChangedValueRef.current ?? valueRef.current,
            createGenericEventDetails(REASONS.scrub, event),
          );

          // Manually dispatch a click event if no movement happened, since
          // preventDefault on pointerdown prevents the browser click event.
          const pointerDownTarget = pointerDownTargetRef.current;
          const input = inputRef.current;
          if (!didMoveRef.current && pointerDownTarget != null && input) {
            pointerDownTarget.dispatchEvent(
              new (ownerWindow(input).MouseEvent)('click', {
                bubbles: true,
                cancelable: true,
              }),
            );
          }

          didMoveRef.current = false;
          pointerDownTargetRef.current = null;
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
      if (!isScrubbingRef.current) {
        return;
      }

      // Prevent text selection.
      event.preventDefault();

      onScrub(event);

      const {movementX, movementY} = event;

      cumulativeDelta += direction === 'vertical' ? movementY : movementX;

      if (Math.abs(cumulativeDelta) >= pixelSensitivity) {
        cumulativeDelta = 0;
        didMoveRef.current = true;
        const dValue = direction === 'vertical' ? -movementY : movementX;
        const stepAmount = getStepAmount(event);
        const rawAmount = dValue * stepAmount;

        if (rawAmount !== 0) {
          allowInputSyncRef.current = true;
          incrementValue(Math.abs(rawAmount), {
            direction: rawAmount >= 0 ? 1 : -1,
            event,
            reason: REASONS.scrub,
          });
        }
      }
    }

    const win = ownerWindow(inputRef.current);
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
    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      rootContextRef.value.setIsScrubbing(false);
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const defaultProps: HTMLProps = {
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
          inputRef.current?.focus();
        }

        isScrubbingRef.current = true;
        didMoveRef.current = false;
        pointerDownTargetRef.current = getTarget(event.nativeEvent ?? event);
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
            if (isScrubbingRef.current) {
              onScrubbingChange(true, event.nativeEvent ?? event);
            }
          }
        }
      },
    };

    const stateAttributes = getStateAttributesProps(state, stateAttributesMapping);

    const merged: any = {};
    Object.assign(merged, defaultProps, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, SCRUB_AREA_STYLE, style(state));
    } else if (style !== undefined) {
      merged.style = Object.assign({}, SCRUB_AREA_STYLE, style);
    }

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...state, ref: scrubAreaRef} as any);
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={scrubAreaRef} />;
      }
    } else {
      element = <span {...merged} ref={scrubAreaRef} />;
    }

    const contextValue: NumberFieldScrubAreaContext = {
      isScrubbing: isScrubbing.value,
      isTouchInput: isTouchInput.value,
      isPointerLockDenied: isPointerLockDenied.value,
      scrubAreaCursorRef,
    };

    return (
      <NumberFieldScrubAreaContext.Provider value={contextValue as any}>
        {element}
      </NumberFieldScrubAreaContext.Provider>
    );
  };
}) as unknown as (props: NumberFieldScrubArea.Props) => JSX.Element;

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

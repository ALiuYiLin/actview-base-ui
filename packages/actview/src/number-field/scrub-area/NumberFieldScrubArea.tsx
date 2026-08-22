import { computed, ref, watch, onUnmounted } from 'actview';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { mergeCleanups } from '@base-ui/actview-utils/mergeCleanups';
import { ownerWindow, ownerDocument } from '@base-ui/actview-utils/owner';
import { platform } from '@base-ui/actview-utils/platform';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useNumberFieldRootContext } from '@/number-field/root/NumberFieldRootContext';
import type { NumberFieldRootState } from '@/number-field/root/NumberFieldRoot';
import { stateAttributesMapping } from '@/number-field/utils/stateAttributesMapping';
import { NumberFieldScrubAreaContext } from '@/number-field/scrub-area/NumberFieldScrubAreaContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { getViewportRect } from '@/number-field/utils/getViewportRect';
import { createGenericEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { getTarget } from '@/floating-ui-actview/utils';

const SCRUB_AREA_STYLE = {
  touchAction: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
} as const;

/**
 * An interactive area where the user can click and drag to change the field value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldScrubArea(componentProps: NumberFieldScrubArea.Props) {
  const rootContext = useNumberFieldRootContext();

  const state = computed(() => rootContext.value.state);

  const scrubAreaRef: { current: HTMLSpanElement | null } = { current: null };

  const isScrubbingRef = { current: false };
  const didMoveRef = { current: false };
  const pointerDownTargetRef: { current: EventTarget | null } = { current: null };
  const scrubAreaCursorRef: { current: HTMLSpanElement | null } = { current: null };
  const virtualCursorCoords = { current: { x: 0, y: 0 } };

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

  function onScrub(event: PointerEvent) {
    const virtualCursor = scrubAreaCursorRef.current;
    const scrubAreaEl = scrubAreaRef.current;

    if (!virtualCursor || !scrubAreaEl) {
      return;
    }

    const rect = getViewportRect(componentProps.teleportDistance, scrubAreaEl);

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
        Math.round(coords.x + event.movementX),
        virtualCursor.offsetWidth / 2,
        rect.left,
        rect.right,
      ),
      y: wrap(
        Math.round(coords.y + event.movementY),
        virtualCursor.offsetHeight / 2,
        rect.top,
        rect.bottom,
      ),
    };

    virtualCursorCoords.current = newCoords;

    updateCursorTransform(virtualCursor, newCoords.x, newCoords.y);
  }

  function onScrubbingChange(scrubbingValue: boolean, event: PointerEvent) {
    isScrubbing.value = scrubbingValue;
    rootContext.value.setIsScrubbing(scrubbingValue);

    const virtualCursor = scrubAreaCursorRef.current;
    if (!virtualCursor || !scrubbingValue) {
      return;
    }

    const initialCoords = {
      x: event.clientX - virtualCursor.offsetWidth / 2,
      y: event.clientY - virtualCursor.offsetHeight / 2,
    };

    virtualCursorCoords.current = initialCoords;

    updateCursorTransform(virtualCursor, initialCoords.x, initialCoords.y);
  }

  // Only listen while actively scrubbing; avoids unrelated pointerup events committing.
  watch(
    () => [rootContext.value.state.disabled, rootContext.value.state.readOnly, isScrubbing.value],
    (_nv, _ov, onCleanup) => {
      const input = rootContext.value.inputRef.current;
      if (!input || rootContext.value.state.disabled || rootContext.value.state.readOnly || !isScrubbing.value) {
        return;
      }

      let cumulativeDelta = 0;

      function handleScrubPointerUp(event: PointerEvent) {
        function handler() {
          try {
            ownerDocument(scrubAreaRef.current).exitPointerLock();
          } catch {
            // Ignore errors.
          } finally {
            isScrubbingRef.current = false;
            onScrubbingChange(false, event);
            rootContext.value.onValueCommitted(
              rootContext.value.lastChangedValueRef.current ?? rootContext.value.valueRef.current,
              createGenericEventDetails(REASONS.scrub, event),
            );

            // Manually dispatch a click event if no movement happened, since
            // preventDefault on pointerdown prevents the browser click event.
            const pointerDownTarget = pointerDownTargetRef.current;
            const inputEl = rootContext.value.inputRef.current;
            if (!didMoveRef.current && pointerDownTarget != null && inputEl) {
              pointerDownTarget.dispatchEvent(
                new (ownerWindow(inputEl).MouseEvent)('click', {
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
        // The effects below can tear down and re-run without unmounting (`<Activity>`), which
        // clears the ref while `isScrubbing` stays `true` and re-attaches this listener. The ref
        // is the source of truth for whether a pointer is actually down.
        if (!isScrubbingRef.current) {
          return;
        }

        // Prevent text selection.
        event.preventDefault();

        onScrub(event);

        const { movementX, movementY } = event;

        cumulativeDelta += componentProps.direction === 'vertical' ? movementY : movementX;

        if (Math.abs(cumulativeDelta) >= (componentProps.pixelSensitivity ?? 2)) {
          cumulativeDelta = 0;
          didMoveRef.current = true;
          const dValue = componentProps.direction === 'vertical' ? -movementY : movementX;
          const stepAmount = rootContext.value.getStepAmount(event);
          const rawAmount = dValue * stepAmount;

          if (rawAmount !== 0) {
            rootContext.value.allowInputSyncRef.current = true;
            rootContext.value.incrementValue(Math.abs(rawAmount), {
              direction: rawAmount >= 0 ? 1 : -1,
              event,
              reason: REASONS.scrub,
            });
          }
        }
      }

      const win = ownerWindow(input);
      const unsubscribe = mergeCleanups(
        addEventListener(win, 'pointerup', handleScrubPointerUp, true),
        addEventListener(win, 'pointermove', handleScrubPointerMove, true),
      );

      onCleanup(() => {
        exitPointerLockTimeout.clear();
        unsubscribe();
      });
    },
  );

  // If the scrub area unmounts mid-scrub, release pointer lock and clear the root's scrubbing
  // state so it doesn't stay locked or stuck. (No commit: there's no pointer release here.)
  onUnmounted(() => {
    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      rootContext.value.setIsScrubbing(false);
      try {
        ownerDocument(scrubAreaRef.current).exitPointerLock();
      } catch {
        // Ignore errors.
      }
    }
  });

  // Prevent scrolling using touch input when scrubbing.
  watch(
    () => [rootContext.value.state.disabled, rootContext.value.state.readOnly],
    (_nv, _ov, onCleanup) => {
      const element = scrubAreaRef.current;
      if (!element || rootContext.value.state.disabled || rootContext.value.state.readOnly) {
        return;
      }

      function handleTouchStart(event: TouchEvent) {
        if (event.touches.length === 1) {
          event.preventDefault();
        }
      }

      onCleanup(addEventListener(element, 'touchstart', handleTouchStart));
    },
    { immediate: true },
  );

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      direction: _direction,
      pixelSensitivity: _pixelSensitivity,
      teleportDistance: _teleportDistance,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getDefaultProps = (): HTMLProps => {
    const disabled = rootContext.value.state.disabled;
    const readOnly = rootContext.value.state.readOnly;
    const direction = componentProps.direction ?? 'horizontal';

    return {
      role: 'presentation',
      style: SCRUB_AREA_STYLE,
      async onPointerDown(event: PointerEvent) {
        if (event.defaultPrevented || readOnly || event.button || disabled) {
          return;
        }

        const isTouch = event.pointerType === 'touch';
        isTouchInput.value = isTouch;

        if (event.pointerType === 'mouse') {
          event.preventDefault();
          rootContext.value.inputRef.current?.focus();
        }

        isScrubbingRef.current = true;
        didMoveRef.current = false;
        pointerDownTargetRef.current = getTarget(event);
        onScrubbingChange(true, event);

        // WebKit causes significant layout shift with the native message, so we can't use it.
        if (!isTouch && !platform.engine.webkit) {
          try {
            // Avoid non-deterministic errors in testing environments. This error sometimes
            // appears:
            // "The root document of this element is not valid for pointer lock."
            await ownerDocument(scrubAreaRef.current).body.requestPointerLock();
            isPointerLockDenied.value = false;
          } catch (error) {
            isPointerLockDenied.value = true;
          } finally {
            // `onScrubbingChange` already updates state synchronously, so re-emit the
            // scrubbing state directly to reflect the resolved pointer-lock result on the
            // cursor.
            if (isScrubbingRef.current) {
              onScrubbingChange(true, event);
            }
          }
        }
      },
    };
  };

  const getElement = useRenderElement('span', componentProps, {
    ref: [componentProps.ref, scrubAreaRef],
    state,
    props: [
      getDefaultProps,
      getElementProps,
      (prev: HTMLProps) => ({ ...prev }),
    ],
    stateAttributesMapping,
  });

  const contextValue = computed<NumberFieldScrubAreaContext>(() => ({
    isScrubbing: isScrubbing.value,
    isTouchInput: isTouchInput.value,
    isPointerLockDenied: isPointerLockDenied.value,
    scrubAreaCursorRef,
  }));

  return (
    <NumberFieldScrubAreaContext.Provider value={contextValue}>
      {getElement()}
    </NumberFieldScrubAreaContext.Provider>
  );
}

export interface NumberFieldScrubAreaState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaProps extends BaseUIComponentProps<
  'span',
  NumberFieldScrubAreaState
> {
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

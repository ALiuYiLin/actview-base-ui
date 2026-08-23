import { defineComponent, onUnmounted, toValue, useRootElement } from 'actview';
import { ownerDocument, ownerWindow } from '@/utils/owner';
import { clamp } from '@/utils/clamp';
import { roundValueToStep } from '../utils/roundValueToStep';
import { validateMinimumDistance } from '../utils/validateMinimumDistance';
import { getMidpoint } from '../utils/getMidpoint';
import { resolveThumbCollision } from '../utils/resolveThumbCollision';
import { getTarget, contains, activeElement } from '@/utils/shadowDom';
import { useDirection } from '@/internals/direction-context/DirectionContext';
import { createChangeEventDetails, createGenericEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useValueAsRef } from '@/utils/useValueAsRef';
import { useAnimationFrame } from '@/utils/useAnimationFrame';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { SliderRootState } from '../root/SliderRoot';

const INTENTIONAL_DRAG_COUNT_THRESHOLD = 3;

interface Coords {
  x: number;
  y: number;
}

interface FingerState {
  value: number | number[];
  thumbIndex: number;
  didSwap: boolean;
}

function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

function parseSize(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getControlOffset(styles: CSSStyleDeclaration | null, vertical: boolean) {
  if (!styles) {
    return {start: 0, end: 0};
  }

  const start = !vertical ? 'InlineStart' : 'Top';
  const end = !vertical ? 'InlineEnd' : 'Bottom';

  return {
    start: parseSize(styles[`border${start}Width`]) + parseSize(styles[`padding${start}`]),
    end: parseSize(styles[`border${end}Width`]) + parseSize(styles[`padding${end}`]),
  };
}

function getFingerCoords(
  event: any,
  touchIdRef: {current: number | null},
): Coords | null {
  // The event is TouchEvent
  if (touchIdRef.current != null && event.changedTouches) {
    const touchEvent = event as TouchEvent;
    for (let i = 0; i < touchEvent.changedTouches.length; i += 1) {
      const touch = touchEvent.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        return {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    }

    return null;
  }

  // The event is PointerEvent
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

/**
 * The clickable, interactive part of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export const SliderControl = defineComponent(function (componentProps: SliderControl.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useSliderRootContext();
  const {
    disabled,
    dragging,
    inset,
    lastChangeReasonRef,
    max,
    min,
    minStepsBetweenValues,
    onValueCommitted,
    orientation,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    pressedValuesRef,
    registerFieldControlRef,
    renderBeforeHydration,
    setActive,
    setDragging,
    setValue,
    state,
    step,
    thumbCollisionBehavior,
    thumbRefs,
    values,
  } = rootContextRef.value;

  const direction = useDirection().value;
  const range = values.length > 1;
  const vertical = orientation === 'vertical';

  const controlRef = {current: null as HTMLElement | null};
  const stylesRef = {current: null as CSSStyleDeclaration | null};
  const setStylesRef = (element: HTMLElement | null) => {
    if (element && stylesRef.current == null) {
      stylesRef.current = ownerWindow(element).getComputedStyle(element);
    }
  };

  // A number that uniquely identifies the current finger in the touch session.
  const touchIdRef = {current: null as number | null};
  // The number of touch/pointermove events that have fired.
  const moveCountRef = {current: 0};
  // The offset amount to each side of the control for inset sliders.
  // This value should be equal to the radius or half the width/height of the thumb.
  const insetThumbOffsetRef = {current: 0};
  const currentInteractionValueRef = {current: null as number | number[] | null};
  const latestValuesRef = useValueAsRef(values);

  function getThumbInput(el: Element | null | undefined) {
    return el?.querySelector<HTMLInputElement>('input[type="range"]');
  }

  function updatePressedThumb(nextIndex: number) {
    pressedThumbIndexRef.current = nextIndex;
    if (!thumbRefs.current[nextIndex]) {
      pressedThumbCenterOffsetRef.current = null;
    }
  }

  function resetPressedThumb() {
    pressedThumbIndexRef.current = -1;
    pressedThumbCenterOffsetRef.current = null;
  }

  function isTargetDisabledThumb(target: EventTarget | null) {
    if (!isElement(target)) {
      return false;
    }

    return thumbRefs.current.some((thumbEl) => {
      if (!isElement(thumbEl) || !contains(thumbEl, target)) {
        return false;
      }

      return getThumbInput(thumbEl)?.disabled === true;
    });
  }

  function getFingerState(fingerCoords: Coords): FingerState | null {
    const control = controlRef.current;
    const thumbIndex = pressedThumbIndexRef.current;

    if (!control || thumbIndex < 0 || thumbIndex >= values.length) {
      if (thumbIndex >= values.length) {
        currentInteractionValueRef.current = null;
      }
      return null;
    }

    const {width, height, bottom, left, right} = control.getBoundingClientRect();

    const controlOffset = getControlOffset(stylesRef.current, vertical);
    const insetThumbOffset = insetThumbOffsetRef.current;
    const controlSize =
      (vertical ? height : width) - controlOffset.start - controlOffset.end - insetThumbOffset * 2;
    const thumbCenterOffset = pressedThumbCenterOffsetRef.current ?? 0;
    const fingerX = fingerCoords.x - thumbCenterOffset;
    const fingerY = fingerCoords.y - thumbCenterOffset;

    const valueSize = vertical
      ? bottom - fingerY - controlOffset.end
      : (direction === 'rtl' ? right - fingerX : fingerX - left) - controlOffset.start;
    // the value at the finger origin scaled down to fit the range [0, 1]
    const valueRescaled = clamp((valueSize - insetThumbOffset) / controlSize, 0, 1);

    let newValue = (max - min) * valueRescaled + min;
    newValue = roundValueToStep(newValue, step, min);
    newValue = clamp(newValue, min, max);

    if (!range) {
      return {
        value: newValue,
        thumbIndex,
        didSwap: false,
      };
    }

    return resolveThumbCollision(
      thumbCollisionBehavior,
      values,
      latestValuesRef.current as readonly number[],
      pressedValuesRef.current as readonly number[] | null,
      thumbIndex,
      newValue,
      min,
      max,
      step,
      minStepsBetweenValues,
    );
  }

  function startPressing(fingerCoords: Coords) {
    pressedValuesRef.current = range ? values.slice() : null;
    currentInteractionValueRef.current = null;
    latestValuesRef.current = values;

    const pressedThumbIndex = pressedThumbIndexRef.current;
    let closestThumbIndex = pressedThumbIndex;

    if (pressedThumbIndex > -1 && pressedThumbIndex < values.length) {
      if (values[pressedThumbIndex] === max) {
        let candidateIndex = pressedThumbIndex;

        while (candidateIndex > 0 && values[candidateIndex - 1] === max) {
          candidateIndex -= 1;
        }

        closestThumbIndex = candidateIndex;
      }
    } else {
      // pressed on control
      const axis = !vertical ? 'x' : 'y';
      let minDistance: number | undefined;

      closestThumbIndex = -1;

      for (let i = 0; i < thumbRefs.current.length; i += 1) {
        const thumbEl = thumbRefs.current[i];
        if (isElement(thumbEl) && !getThumbInput(thumbEl)?.disabled) {
          const midpoint = getMidpoint(thumbEl, vertical);
          const distance = Math.abs(fingerCoords[axis] - midpoint);

          if (minDistance === undefined || distance <= minDistance) {
            closestThumbIndex = i;
            minDistance = distance;
          }
        }
      }
    }

    if (closestThumbIndex > -1 && closestThumbIndex !== pressedThumbIndex) {
      updatePressedThumb(closestThumbIndex);
    }

    if (inset) {
      const thumbEl = thumbRefs.current[closestThumbIndex];
      if (isElement(thumbEl)) {
        const thumbRect = thumbEl.getBoundingClientRect();
        const side = !vertical ? 'width' : 'height';
        insetThumbOffsetRef.current = thumbRect[side] / 2;
      }
    }
  }

  function focusThumb(thumbIndex: number) {
    const input = getThumbInput(thumbRefs.current?.[thumbIndex]);
    if (!input) {
      return;
    }

    input.focus({preventScroll: true} as any);
  }

  function setValueFromPointer(
    finger: FingerState,
    reason: typeof REASONS.trackPress | typeof REASONS.drag,
    nativeEvent: any,
  ) {
    const applied = setValue(
      finger.value,
      createChangeEventDetails(reason, nativeEvent, undefined, {
        activeThumbIndex: finger.thumbIndex,
      }),
    );

    if (applied) {
      currentInteractionValueRef.current = finger.value;
      latestValuesRef.current = Array.isArray(finger.value) ? finger.value : [finger.value];

      // Only track and focus the swapped thumb once the change is actually applied so a
      // canceled swap doesn't leak the new index into subsequent moves.
      if (finger.didSwap) {
        updatePressedThumb(finger.thumbIndex);
        focusThumb(finger.thumbIndex);
      }
    }

    return applied;
  }

  const handleTouchMove = (nativeEvent: any) => {
    const fingerCoords = getFingerCoords(nativeEvent, touchIdRef);

    if (fingerCoords == null) {
      return;
    }

    moveCountRef.current += 1;

    // Cancel move in case some other element consumed a pointerup event and it was not fired.
    if (nativeEvent.type === 'pointermove' && nativeEvent.buttons === 0) {
      handleTouchEnd(nativeEvent);
      return;
    }

    const finger = getFingerState(fingerCoords);

    if (finger == null) {
      return;
    }

    if (validateMinimumDistance(finger.value, step, minStepsBetweenValues)) {
      if (!dragging && moveCountRef.current > INTENTIONAL_DRAG_COUNT_THRESHOLD) {
        setDragging(true);
      }

      setValueFromPointer(finger, REASONS.drag, nativeEvent);
    }
  };

  const handleTouchEnd = (nativeEvent: any) => {
    setActive(-1);
    setDragging(false);

    pressedThumbCenterOffsetRef.current = null;

    // If the value array shrank or grew mid-drag, the cached interaction value no longer
    // matches the current thumbs (the pressed index can still be in range), so dropping it
    // keeps a stale or malformed array from being committed on release.
    const interactionValue = currentInteractionValueRef.current;
    if (Array.isArray(interactionValue) && interactionValue.length !== values.length) {
      currentInteractionValueRef.current = null;
    }

    if (currentInteractionValueRef.current != null) {
      const commitReason = lastChangeReasonRef.current;
      onValueCommitted(
        currentInteractionValueRef.current,
        createGenericEventDetails(commitReason, nativeEvent),
      );
    }

    if ('pointerType' in nativeEvent && controlRef.current?.hasPointerCapture(nativeEvent.pointerId)) {
      controlRef.current?.releasePointerCapture(nativeEvent.pointerId);
    }

    pressedThumbIndexRef.current = -1;
    touchIdRef.current = null;
    stopListening();
  };

  const handleTouchStart = (nativeEvent: TouchEvent) => {
    if (disabled) {
      return;
    }

    if (isTargetDisabledThumb(getTarget(nativeEvent))) {
      resetPressedThumb();
      return;
    }

    const touch = nativeEvent.changedTouches[0];
    if (touch == null) {
      return;
    }

    touchIdRef.current = touch.identifier;

    const fingerCoords = {x: touch.clientX, y: touch.clientY};
    startPressing(fingerCoords);

    const finger = getFingerState(fingerCoords);

    if (finger == null) {
      return;
    }

    focusThumb(finger.thumbIndex);
    setValueFromPointer(finger, REASONS.trackPress, nativeEvent);

    moveCountRef.current = 0;
    const doc = ownerDocument(controlRef.current);
    doc.addEventListener('touchmove', handleTouchMove as any, {passive: true});
    doc.addEventListener('touchend', handleTouchEnd as any, {passive: true});
  };

  const stopListening = () => {
    const doc = ownerDocument(controlRef.current);
    doc.removeEventListener('pointermove', handleTouchMove as any);
    doc.removeEventListener('pointerup', handleTouchEnd as any);
    doc.removeEventListener('touchmove', handleTouchMove as any);
    doc.removeEventListener('touchend', handleTouchEnd as any);
    pressedValuesRef.current = null;
    currentInteractionValueRef.current = null;
  };

  const focusFrame = useAnimationFrame();

  // touchstart 监听（原生）
  const handleNativeTouchStart = (e: TouchEvent) => {
    handleTouchStart(e);
  };
  const controlElement = () => controlRef.current;
  const attachTouch = () => {
    const control = controlRef.current;
    if (!control) {
      return () => stopListening();
    }

    control.addEventListener('touchstart', handleNativeTouchStart, {passive: true});

    return () => {
      control.removeEventListener('touchstart', handleNativeTouchStart);
      focusFrame.cancel();
      stopListening();
    };
  };
  const cleanupRef = {current: null as (() => void) | null};
  const scheduleAttach = () => {
    cleanupRef.current?.();
    cleanupRef.current = attachTouch();
  };
  // controlRef 挂载后 attach
  queueMicrotask(scheduleAttach);
  onUnmounted(() => {
    cleanupRef.current?.();
  });

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render: renderProp, className, style, ...elementProps} = componentProps;

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, sliderStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {
        ['data-base-ui-slider-control' as string]: renderBeforeHydration ? '' : undefined,
        onPointerDown(event: any) {
          const control = controlRef.current;
          const target = getTarget(event);

          if (
            !control ||
            disabled ||
            event.defaultPrevented ||
            !isElement(target) ||
            // Only handle left clicks
            event.button !== 0
          ) {
            return;
          }

          if (isTargetDisabledThumb(target)) {
            resetPressedThumb();
            return;
          }

          const fingerCoords = {x: event.clientX, y: event.clientY};
          startPressing(fingerCoords);

          const finger = getFingerState(fingerCoords);

          if (finger == null) {
            return;
          }

          const pressedOnFocusedThumb = contains(
            thumbRefs.current[finger.thumbIndex],
            activeElement(ownerDocument(control)),
          );

          if (pressedOnFocusedThumb) {
            event.preventDefault();
          } else {
            focusFrame.request(() => {
              focusThumb(finger.thumbIndex);
            });
          }

          setDragging(true);

          const pressedOnAnyThumb = pressedThumbCenterOffsetRef.current != null;
          if (!pressedOnAnyThumb) {
            setValueFromPointer(finger, REASONS.trackPress, event);
          }

          if (event.pointerId) {
            control.setPointerCapture(event.pointerId);
          }

          moveCountRef.current = 0;
          const doc = ownerDocument(control);
          doc.addEventListener('pointermove', handleTouchMove as any, {passive: true});
          doc.addEventListener('pointerup', handleTouchEnd as any, {once: true});
        },
      },
      elementProps,
      stateAttributes,
    );

    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    const refs = (el: HTMLElement | null) => {
      registerFieldControlRef?.(el);
      controlRef.current = el;
      setStylesRef(el);
    };

    if (renderProp) {
      if (typeof renderProp === 'function') {
        return renderProp({...merged, ...stateValue, ref: refs} as any);
      }
      const renderProps = renderProp.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = renderProp.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={renderProp.key} {...mergedRenderProps} ref={[rootRef, refs]} />;
    }
    return <div {...merged} ref={[rootRef, refs]}>{componentProps.children}</div>;
  };
}) as unknown as (props: SliderControl.Props) => JSX.Element;

export interface SliderControlState extends SliderRootState {}

export interface SliderControlProps extends BaseUIComponentProps<'div', SliderControlState> {}

export namespace SliderControl {
  export type State = SliderControlState;
  export type Props = SliderControlProps;
}

import {computed, onUnmounted, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
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
import { useAnimationFrame } from '@/utils/useAnimationFrame';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { BaseUIComponentProps } from '@/internals/types';
import type { SliderRootState } from '../root/SliderRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

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
  touchIdRef: Ref<number | null>,
): Coords | null {
  // The event is TouchEvent
  if (touchIdRef.value != null && event.changedTouches) {
    const touchEvent = event as TouchEvent;
    for (let i = 0; i < touchEvent.changedTouches.length; i += 1) {
      const touch = touchEvent.changedTouches[i];
      if (touch.identifier === touchIdRef.value) {
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
export function SliderControl(componentProps: SliderControl.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：⚠️ 不解构载体（解构捕获快照）——
  // 事件期 handler 内一律 rootContext.X 属性访问拿实时值。
  const rootContext = useSliderRootContext();

  const direction = useDirection().value;
  const range = computed(() => rootContext.values.length > 1);
  const vertical = rootContext.orientation === 'vertical';

  const controlRef = ref(null as HTMLElement | null);
  const stylesRef = ref(null as CSSStyleDeclaration | null);
  const setStylesRef = (element: HTMLElement | null) => {
    if (element && stylesRef.value == null) {
      stylesRef.value = ownerWindow(element).getComputedStyle(element);
    }
  };

  // A number that uniquely identifies the current finger in the touch session.
  const touchIdRef = ref(null as number | null);
  // The number of touch/pointermove events that have fired.
  const moveCountRef = ref(0);
  // The offset amount to each side of the control for inset sliders.
  // This value should be equal to the radius or half the width/height of the thumb.
  const insetThumbOffsetRef = ref(0);
  const currentInteractionValueRef = ref(null as number | number[] | null);
  // 手动维护的「最新值」缓存（setPointer 应用后更新）——语义对齐原 useValueAsRef。
  const latestValuesRef = ref(rootContext.values as readonly number[]);

  function getThumbInput(el: Element | null | undefined) {
    return el?.querySelector<HTMLInputElement>('input[type="range"]');
  }

  function updatePressedThumb(nextIndex: number) {
    rootContext.pressedThumbIndexRef.value = nextIndex;
    if (!rootContext.thumbRefs.value[nextIndex]) {
      rootContext.pressedThumbCenterOffsetRef.value = null;
    }
  }

  function resetPressedThumb() {
    rootContext.pressedThumbIndexRef.value = -1;
    rootContext.pressedThumbCenterOffsetRef.value = null;
  }

  function isTargetDisabledThumb(target: EventTarget | null) {
    if (!isElement(target)) {
      return false;
    }

    return rootContext.thumbRefs.value.some((thumbEl) => {
      if (!isElement(thumbEl) || !contains(thumbEl, target)) {
        return false;
      }

      return getThumbInput(thumbEl)?.disabled === true;
    });
  }

  function getFingerState(fingerCoords: Coords): FingerState | null {
    const control = controlRef.value;
    const thumbIndex = rootContext.pressedThumbIndexRef.value;
    const values = rootContext.values;

    if (!control || thumbIndex < 0 || thumbIndex >= values.length) {
      if (thumbIndex >= values.length) {
        currentInteractionValueRef.value = null;
      }
      return null;
    }

    const {width, height, bottom, left, right} = control.getBoundingClientRect();

    const controlOffset = getControlOffset(stylesRef.value, vertical);
    const insetThumbOffset = insetThumbOffsetRef.value;
    const controlSize =
      (vertical ? height : width) - controlOffset.start - controlOffset.end - insetThumbOffset * 2;
    const thumbCenterOffset = rootContext.pressedThumbCenterOffsetRef.value ?? 0;
    const fingerX = fingerCoords.x - thumbCenterOffset;
    const fingerY = fingerCoords.y - thumbCenterOffset;

    const valueSize = vertical
      ? bottom - fingerY - controlOffset.end
      : (direction === 'rtl' ? right - fingerX : fingerX - left) - controlOffset.start;
    // the value at the finger origin scaled down to fit the range [0, 1]
    const valueRescaled = clamp((valueSize - insetThumbOffset) / controlSize, 0, 1);

    let newValue = (rootContext.max - rootContext.min) * valueRescaled + rootContext.min;
    newValue = roundValueToStep(newValue, rootContext.step, rootContext.min);
    newValue = clamp(newValue, rootContext.min, rootContext.max);

    if (!range.value) {
      return {
        value: newValue,
        thumbIndex,
        didSwap: false,
      };
    }

    return resolveThumbCollision(
      rootContext.thumbCollisionBehavior,
      values,
      latestValuesRef.value as readonly number[],
      rootContext.pressedValuesRef.value as readonly number[] | null,
      thumbIndex,
      newValue,
      rootContext.min,
      rootContext.max,
      rootContext.step,
      rootContext.minStepsBetweenValues,
    );
  }

  function startPressing(fingerCoords: Coords) {
    const values = rootContext.values;
    pressedValuesRefReset();
    rootContext.pressedValuesRef.value = range.value ? values.slice() : null;
    currentInteractionValueRef.value = null;
    latestValuesRef.value = values;

    const pressedThumbIndex = rootContext.pressedThumbIndexRef.value;
    let closestThumbIndex = pressedThumbIndex;

    if (pressedThumbIndex > -1 && pressedThumbIndex < values.length) {
      if (values[pressedThumbIndex] === rootContext.max) {
        let candidateIndex = pressedThumbIndex;

        while (candidateIndex > 0 && values[candidateIndex - 1] === rootContext.max) {
          candidateIndex -= 1;
        }

        closestThumbIndex = candidateIndex;
      }
    } else {
      // pressed on control
      const axis = !vertical ? 'x' : 'y';
      let minDistance: number | undefined;

      closestThumbIndex = -1;

      for (let i = 0; i < rootContext.thumbRefs.value.length; i += 1) {
        const thumbEl = rootContext.thumbRefs.value[i];
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

    if (rootContext.inset) {
      const thumbEl = rootContext.thumbRefs.value[closestThumbIndex];
      if (isElement(thumbEl)) {
        const thumbRect = thumbEl.getBoundingClientRect();
        const side = !vertical ? 'width' : 'height';
        insetThumbOffsetRef.value = thumbRect[side] / 2;
      }
    }
  }

  function pressedValuesRefReset() {
    // 占位：startPressing 前的清理在下方赋值中已覆盖。
  }

  function focusThumb(thumbIndex: number) {
    const input = getThumbInput(rootContext.thumbRefs.value?.[thumbIndex]);
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
    const applied = rootContext.setValue(
      finger.value,
      createChangeEventDetails(reason, nativeEvent, undefined, {
        activeThumbIndex: finger.thumbIndex,
      }),
    );

    if (applied) {
      currentInteractionValueRef.value = finger.value;
      latestValuesRef.value = Array.isArray(finger.value) ? finger.value : [finger.value];

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

    moveCountRef.value += 1;

    // Cancel move in case some other element consumed a pointerup event and it was not fired.
    if (nativeEvent.type === 'pointermove' && nativeEvent.buttons === 0) {
      handleTouchEnd(nativeEvent);
      return;
    }

    const finger = getFingerState(fingerCoords);

    if (finger == null) {
      return;
    }

    if (validateMinimumDistance(finger.value, rootContext.step, rootContext.minStepsBetweenValues)) {
      if (!rootContext.dragging && moveCountRef.value > INTENTIONAL_DRAG_COUNT_THRESHOLD) {
        rootContext.setDragging(true);
      }

      setValueFromPointer(finger, REASONS.drag, nativeEvent);
    }
  };

  const handleTouchEnd = (nativeEvent: any) => {
    rootContext.setActive(-1);
    rootContext.setDragging(false);

    rootContext.pressedThumbCenterOffsetRef.value = null;

    // If the value array shrank or grew mid-drag, the cached interaction value no longer
    // matches the current thumbs (the pressed index can still be in range), so dropping it
    // keeps a stale or malformed array from being committed on release.
    const interactionValue = currentInteractionValueRef.value;
    if (Array.isArray(interactionValue) && interactionValue.length !== rootContext.values.length) {
      currentInteractionValueRef.value = null;
    }

    if (currentInteractionValueRef.value != null) {
      const commitReason = rootContext.lastChangeReasonRef.value;
      rootContext.onValueCommitted?.(
        currentInteractionValueRef.value,
        createGenericEventDetails(commitReason, nativeEvent),
      );
    }

    if ('pointerType' in nativeEvent && controlRef.value?.hasPointerCapture(nativeEvent.pointerId)) {
      controlRef.value?.releasePointerCapture(nativeEvent.pointerId);
    }

    rootContext.pressedThumbIndexRef.value = -1;
    touchIdRef.value = null;
    stopListening();
  };

  const handleTouchStart = (nativeEvent: TouchEvent) => {
    if (rootContext.disabled) {
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

    touchIdRef.value = touch.identifier;

    const fingerCoords = {x: touch.clientX, y: touch.clientY};
    startPressing(fingerCoords);

    const finger = getFingerState(fingerCoords);

    if (finger == null) {
      return;
    }

    focusThumb(finger.thumbIndex);
    setValueFromPointer(finger, REASONS.trackPress, nativeEvent);

    moveCountRef.value = 0;
    const doc = ownerDocument(controlRef.value);
    doc.addEventListener('touchmove', handleTouchMove as any, {passive: true});
    doc.addEventListener('touchend', handleTouchEnd as any, {passive: true});
  };

  const stopListening = () => {
    const doc = ownerDocument(controlRef.value);
    doc.removeEventListener('pointermove', handleTouchMove as any);
    doc.removeEventListener('pointerup', handleTouchEnd as any);
    doc.removeEventListener('touchmove', handleTouchMove as any);
    doc.removeEventListener('touchend', handleTouchEnd as any);
    rootContext.pressedValuesRef.value = null;
    currentInteractionValueRef.value = null;
  };

  const focusFrame = useAnimationFrame();

  // touchstart 监听（原生）
  const handleNativeTouchStart = (e: TouchEvent) => {
    handleTouchStart(e);
  };
  const attachTouch = () => {
    const control = controlRef.value;
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
  const cleanupRef = ref(null as (() => void) | null);
  const scheduleAttach = () => {
    cleanupRef.value?.();
    cleanupRef.value = attachTouch();
  };
  // controlRef 挂载后 attach
  queueMicrotask(scheduleAttach);
  onUnmounted(() => {
    cleanupRef.value?.();
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<SliderControlState>(() => rootContext.state);

  // 根元素 props：control 标记 → pointerdown 拖拽入口 → 透传。
  const rootProps = computed<Record<string, any>>(() => ({
    ['data-base-ui-slider-control' as string]: rootContext.renderBeforeHydration ? '' : undefined,
    onPointerDown(event: any) {
      const control = controlRef.value;
      const target = getTarget(event);

      if (
        !control ||
        rootContext.disabled ||
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
        rootContext.thumbRefs.value[finger.thumbIndex],
        activeElement(ownerDocument(control)),
      );

      if (pressedOnFocusedThumb) {
        event.preventDefault();
      } else {
        focusFrame.request(() => {
          focusThumb(finger.thumbIndex);
        });
      }

      rootContext.setDragging(true);

      const pressedOnAnyThumb = rootContext.pressedThumbCenterOffsetRef.value != null;
      if (!pressedOnAnyThumb) {
        setValueFromPointer(finger, REASONS.trackPress, event);
      }

      if (event.pointerId) {
        control.setPointerCapture(event.pointerId);
      }

      moveCountRef.value = 0;
      const doc = ownerDocument(control);
      doc.addEventListener('pointermove', handleTouchMove as any, {passive: true});
      doc.addEventListener('pointerup', handleTouchEnd as any, {once: true});
    },
    ...elementProps.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: sliderStateAttributesMapping,
          ref: useMergedRefs(
            rootRef,
            rootContext.registerFieldControlRef,
            setStylesRef,
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface SliderControlState extends SliderRootState {}

export interface SliderControlProps extends BaseUIComponentProps<'div', SliderControlState> {}

export namespace SliderControl {
  export type State = SliderControlState;
  export type Props = SliderControlProps;
}

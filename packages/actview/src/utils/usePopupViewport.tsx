import { computed, onMounted, ref, unref, watch } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import { inertValue } from '@base-ui/actview-utils/inertValue';
import { useAnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import { usePreviousValue } from '@base-ui/actview-utils/usePreviousValue';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import type { ActviewStore } from '@base-ui/actview-utils/store';
import { createElement, type VNode, type VNodeChild } from '@actview/jsx';
import type { Dimensions } from '@floating-ui/dom';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { usePopupAutoResize, type Side } from '@/utils/usePopupAutoResize';
import { useDirection } from '@/direction-provider';
import { adaptiveOrigin } from '@/utils/adaptiveOriginMiddleware';

export const popupViewportStateMapping: StateAttributesMapping<{
  activationDirection: string | undefined;
}> = {
  activationDirection: (value) =>
    value
      ? {
          'data-activation-direction': value,
        }
      : null,
};

export interface PopupViewportState {
  /**
   * Direction from which the popup was activated, used for directional animations.
   */
  activationDirection: string | undefined;
  /**
   * Whether the viewport is currently transitioning between contents.
   */
  transitioning: boolean;
}

type PopupViewportStore = Pick<ActviewStore<any, any, any>, 'useState' | 'set'>;

export interface UsePopupViewportParameters {
  /**
   * Popup store instance for accessing shared popup state.
   */
  store: PopupViewportStore;
  /**
   * Side of the positioner relative to the trigger.
   */
  side: Side | Ref<Side>;
  /**
   * Viewport children to render in the current container.
   */
  children?: VNodeChild | undefined;
}

export interface UsePopupViewportResult {
  /**
   * Resolver for the viewport children. Invoke inside JSX; it re-evaluates the
   * current/previous container structure on every render.
   */
  children: () => VNode;
  /**
   * Viewport state used for data attributes and render prop styling.
   */
  state: ComputedRef<PopupViewportState>;
}

/**
 * Builds morphing viewport containers for popups that animate between trigger-based content.
 * Handles previous-content snapshots, auto-resize, and state attributes for transitions.
 */
export function usePopupViewport(parameters: UsePopupViewportParameters): UsePopupViewportResult {
  const { store, side } = parameters;

  const direction = useDirection();

  const activeTrigger = store.useState('activeTriggerElement');
  const activeTriggerId = store.useState('activeTriggerId');
  const open = store.useState('open');
  const payload = store.useState('payload');
  const mounted = store.useState('mounted');
  const popupElement = store.useState('popupElement');
  const positionerElement = store.useState('positionerElement');

  const previousActiveTrigger = usePreviousValue(
    computed(() => (unref(open) ? unref(activeTrigger) : null)),
  );
  // Remount current content on trigger changes (and once more when payload lags) to avoid DOM reuse flashes.
  // The key bumps immediately on trigger switches, then again if the payload arrives on a later render.
  const currentContentKey = usePopupContentKey(activeTriggerId, payload);

  let capturedNode: HTMLElement | null = null;
  const previousContentNode = ref<HTMLElement | null>(null);

  const newTriggerOffset = ref<Offset | null>(null);

  let currentContainer: HTMLDivElement | null = null;
  let previousContainer: HTMLDivElement | null = null;

  const onAnimationsFinished = useAnimationsFinished(
    { get current() { return currentContainer; } },
    true,
  );
  const cleanupFrame = useAnimationFrame();
  let cleanupController: AbortController | null = null;

  const previousContentDimensions = ref<{
    width: number;
    height: number;
  } | null>(null);

  const showStartingStyleAttribute = ref(false);

  useIsoLayoutEffect(() => {
    store.set('adaptiveOrigin', adaptiveOrigin);
    return () => {
      store.set('adaptiveOrigin', undefined);
    };
  });

  const handleMeasureLayout = () => {
    currentContainer?.style.setProperty('animation', 'none');
    currentContainer?.style.setProperty('transition', 'none');

    previousContainer?.style.setProperty('display', 'none');
  };

  const handleMeasureLayoutComplete = (previousDimensions: Dimensions | null) => {
    currentContainer?.style.removeProperty('animation');
    currentContainer?.style.removeProperty('transition');

    previousContainer?.style.removeProperty('display');

    if (previousDimensions) {
      previousContentDimensions.value = previousDimensions;
    }
  };

  const armViewportCleanup = () => {
    cleanupController?.abort();
    const controller = new AbortController();
    cleanupController = controller;
    onAnimationsFinished(() => {
      previousContentNode.value = null;
      previousContentDimensions.value = null;
      capturedNode = null;
    }, controller.signal);
  };

  let lastHandledTrigger: Element | null = null;

  watch(
    [() => unref(open), () => unref(mounted)],
    ([isOpen, isMounted]) => {
      if (!isOpen || !isMounted) {
        lastHandledTrigger = null;
      }
    },
    { flush: 'post' },
  );

  watch(
    [() => unref(activeTrigger), () => previousActiveTrigger.value],
    ([trigger, prevTrigger]) => {
      // When a trigger changes, set the captured children HTML to state,
      // so we can render both new and old content.
      if (
        trigger &&
        prevTrigger &&
        trigger !== prevTrigger &&
        lastHandledTrigger !== trigger &&
        capturedNode
      ) {
        previousContentNode.value = capturedNode;
        showStartingStyleAttribute.value = true;

        // Calculate the relative position between the previous and new trigger,
        // so we can pass it to the style hook for animation purposes.
        const offset = calculateRelativePosition(prevTrigger, trigger);
        newTriggerOffset.value = offset;

        lastHandledTrigger = trigger;
      }
    },
    { flush: 'post' },
  );

  // Arm cleanup after a trigger change, and re-arm it if the current container remounts
  // mid-transition when a lagging payload bumps `currentContentKey`. The remount discards
  // the running entry animation (and with transition-style CSS the replacement mounts at
  // final styles with no animation at all), so re-run the starting-style choreography —
  // otherwise the watcher either strands or fires before the previous container's exit
  // animation finishes.
  watch(
    [() => currentContentKey.value, () => previousContentNode.value],
    ([, prevNode]) => {
      if (prevNode == null) {
        return;
      }

      // Abort the stale watcher synchronously. The remount cancels the old container's
      // animations, and the resulting promise rejection would otherwise run the cleanup
      // in a microtask before the re-armed watcher below is in place.
      cleanupController?.abort();

      showStartingStyleAttribute.value = true;

      cleanupFrame.request(() => {
        // ActView has no `flushSync`; the attribute is cleared directly before re-arming.
        showStartingStyleAttribute.value = false;
        armViewportCleanup();
      });
    },
    { flush: 'post' },
  );

  // Capture a clone of the current content DOM subtree when not transitioning.
  // We can't store previous React nodes as they may be stateful; instead we capture DOM clones for visual continuity.
  const captureContent = () => {
    // When a transition is in progress, we store the next content in capturedNode.
    // This handles the case where the trigger changes multiple times before the transition finishes.
    // We want to always capture the latest content for the previous snapshot.
    // So clicking quickly on T1, T2, T3 will result in the following sequence:
    // 1. T1 -> T2: previousContent = T1, currentContent = T2
    // 2. T2 -> T3: previousContent = T2, currentContent = T3
    const source = currentContainer;
    if (!source) {
      return;
    }

    const wrapper = ownerDocument(source).createElement('div');
    for (const child of Array.from(source.childNodes)) {
      wrapper.appendChild(child.cloneNode(true));
    }

    capturedNode = wrapper;
  };

  onMounted(captureContent);
  watch([() => currentContentKey.value], () => captureContent(), { flush: 'post' });

  // When previousContentNode is present, imperatively populate the previous container with the cloned children.
  watch(
    () => previousContentNode.value,
    (prevNode: HTMLElement | null) => {
      const container = previousContainer;
      if (!container || !prevNode) {
        return;
      }

      container.replaceChildren(...Array.from(prevNode.childNodes));
    },
    { flush: 'post' },
  );

  usePopupAutoResize({
    popupElement,
    positionerElement,
    mounted,
    content: payload,
    onMeasureLayout: handleMeasureLayout,
    onMeasureLayoutComplete: handleMeasureLayoutComplete,
    side,
    direction,
  });

  const state = computed<PopupViewportState>(() => ({
    activationDirection: getActivationDirection(newTriggerOffset.value),
    transitioning: previousContentNode.value != null,
  }));

  const getChildren = (): VNode => {
    const isTransitioning = previousContentNode.value != null;
    if (!isTransitioning) {
      return (
        <div
          data-current
          ref={(node: HTMLDivElement | null) => {
            currentContainer = node;
          }}
          key={currentContentKey.value}
        >
          {parameters.children}
        </div>
      );
    }

    return (
      <>
        {createElement('div', {
          'data-previous': '',
          inert: inertValue(true),
          ref: (node: HTMLDivElement | null) => {
            previousContainer = node;
          },
          style: {
            ...(previousContentDimensions.value
              ? {
                  '--popup-width': `${previousContentDimensions.value.width}px`,
                  '--popup-height': `${previousContentDimensions.value.height}px`,
                }
              : null),
            position: 'absolute',
          },
          key: 'previous',
          'data-ending-style': showStartingStyleAttribute.value ? undefined : '',
        })}
        <div
          data-current
          ref={(node: HTMLDivElement | null) => {
            currentContainer = node;
          }}
          key={currentContentKey.value}
          data-starting-style={showStartingStyleAttribute.value ? '' : undefined}
        >
          {parameters.children}
        </div>
      </>
    );
  };

  return { children: getChildren, state };
}

type Offset = {
  horizontal: number;
  vertical: number;
};

/**
 * Returns a string describing the provided offset.
 * It describes both the horizontal and vertical offset, separated by a space.
 *
 * @param offset
 */
function getActivationDirection(offset: Offset | null): string | undefined {
  if (!offset) {
    return undefined;
  }

  return `${getValueWithTolerance(offset.horizontal, 5, 'right', 'left')} ${getValueWithTolerance(offset.vertical, 5, 'down', 'up')}`;
}

/**
 * Returns a label describing the value (positive/negative) treating values
 * within tolerance as zero.
 *
 * @param value Value to check
 * @param tolerance Tolerance to treat the value as zero.
 * @param positiveLabel
 * @param negativeLabel
 * @returns If 0 < abs(value) < tolerance, returns an empty string. Otherwise returns positiveLabel or negativeLabel.
 */
function getValueWithTolerance(
  value: number,
  tolerance: number,
  positiveLabel: string,
  negativeLabel: string,
) {
  if (value > tolerance) {
    return positiveLabel;
  }

  if (value < -tolerance) {
    return negativeLabel;
  }

  return '';
}

/**
 * Calculates the relative position between centers of two elements.
 */
function calculateRelativePosition(from: Element, to: Element): Offset {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  const fromCenter = {
    x: fromRect.left + fromRect.width / 2,
    y: fromRect.top + fromRect.height / 2,
  };
  const toCenter = {
    x: toRect.left + toRect.width / 2,
    y: toRect.top + toRect.height / 2,
  };

  return {
    horizontal: toCenter.x - fromCenter.x,
    vertical: toCenter.y - fromCenter.y,
  };
}

/**
 * Returns a key that forces remounting content when triggers change or a payload is updated.
 */
function usePopupContentKey(
  activeTriggerId: Ref<string | null>,
  payload: Ref<unknown>,
): Ref<string> {
  const contentKey = ref(0);
  let previousActiveTriggerId: string | null = unref(activeTriggerId);
  let previousPayload: unknown = unref(payload);
  let pendingPayloadUpdate = false;

  watch(
    [() => unref(activeTriggerId), () => unref(payload)],
    ([triggerId, currentPayload]) => {
      // Compare against the last committed values to decide whether we need a new DOM subtree.
      const triggerIdChanged = triggerId !== previousActiveTriggerId;
      const payloadChanged = currentPayload !== previousPayload;

      if (triggerIdChanged) {
        // Remount immediately on trigger change; remember if payload hasn't caught up yet.
        contentKey.value += 1;
        pendingPayloadUpdate = !payloadChanged;
      } else if (pendingPayloadUpdate && payloadChanged) {
        // Payload arrived a render later, so remount once more to avoid reusing the old <img>.
        contentKey.value += 1;
        pendingPayloadUpdate = false;
      }

      // Persist current values for the next render's comparison.
      previousActiveTriggerId = triggerId;
      previousPayload = currentPayload;
    },
    { flush: 'post' },
  );

  return computed(() => `${unref(activeTriggerId) ?? 'current'}-${contentKey.value}`);
}

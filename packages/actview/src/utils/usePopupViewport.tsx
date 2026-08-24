import { ref, watch } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { useDirection } from '@/direction-provider';
import { adaptiveOrigin } from '@/utils/adaptiveOriginMiddleware';
import { inertValue } from '@/utils/inertValue';
import type { ReactStore } from '@/internals/store/ReactStore';

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

export interface UsePopupViewportParameters {
  store: ReactStore<any, any, any>;
  side: any;
  children?: any;
}

export interface UsePopupViewportResult {
  children: any;
  state: PopupViewportState;
}

/**
 * Builds morphing viewport containers for popups that animate between trigger-based content.
 * (actview 转译版：省略 usePopupAutoResize 的尺寸测量——jsdom 无布局。）
 */
export function usePopupViewport(
  parameters: UsePopupViewportParameters,
): UsePopupViewportResult {
  const {store, side, children} = parameters;

  const direction = useDirection();

  const activeTrigger = store.useState('activeTriggerElement');
  const activeTriggerId = store.useState('activeTriggerId');
  const open = store.useState('open');
  const payload = store.useState('payload');
  const mounted = store.useState('mounted');

  const previousActiveTriggerRef = ref(null as Element | null);
  // Remount current content on trigger changes (and once more when payload lags).
  const currentContentKey = usePopupContentKey(activeTriggerId, payload);

  const capturedNodeRef = ref(null as HTMLElement | null);
  const previousContentNode = ref<HTMLElement | null>(null);
  const showStartingStyleAttribute = ref(false);

  const currentContainerRef = ref(null as HTMLDivElement | null);
  const previousContainerRef = ref(null as HTMLDivElement | null);

  const onAnimationsFinished = useAnimationsFinished(currentContainerRef, true);

  // When a trigger changes, set the captured children HTML to state.
  const lastHandledTriggerRef = ref(null as Element | null);
  watch(
    () => [open.value, mounted.value, activeTrigger.value, previousActiveTriggerRef.value] as const,
    () => {
      if (!open.value || !mounted.value) {
        lastHandledTriggerRef.value = null;
        return;
      }

      const trigger = activeTrigger.value;
      const previousTrigger = previousActiveTriggerRef.value;
      if (
        trigger &&
        previousTrigger &&
        trigger !== previousTrigger &&
        lastHandledTriggerRef.value !== trigger &&
        capturedNodeRef.value
      ) {
        previousContentNode.value = capturedNodeRef.value;
        showStartingStyleAttribute.value = true;
        lastHandledTriggerRef.value = trigger;
      }
      if (trigger) {
        previousActiveTriggerRef.value = trigger;
      }
    },
    {flush: 'post', immediate: true},
  );

  // Arm cleanup after a trigger change.
  const cleanupControllerRef = ref(null as AbortController | null);
  const armViewportCleanup = () => {
    cleanupControllerRef.value?.abort();
    const controller = new AbortController();
    cleanupControllerRef.value = controller;
    onAnimationsFinished(() => {
      previousContentNode.value = null;
      capturedNodeRef.value = null;
    }, controller.signal);
  };

  watch(
    () => [currentContentKey.value, previousContentNode.value] as const,
    () => {
      if (previousContentNode.value == null) {
        return;
      }
      cleanupControllerRef.value?.abort();
      showStartingStyleAttribute.value = true;
      armViewportCleanup();
    },
    {flush: 'post', immediate: true},
  );

  // Capture a clone of the current content DOM subtree when not transitioning.
  watch(
    () => [previousContentNode.value, currentContainerRef.value] as const,
    () => {
      if (previousContentNode.value != null) {
        return;
      }
      const source = currentContainerRef.value;
      if (!source) {
        return;
      }
      const wrapper = source.ownerDocument.createElement('div');
      for (const child of Array.from(source.childNodes)) {
        wrapper.appendChild(child.cloneNode(true));
      }
      capturedNodeRef.value = wrapper;
    },
    {flush: 'post', immediate: true},
  );

  // Populate the previous container with the cloned children.
  watch(
    () => [previousContainerRef.value, previousContentNode.value] as const,
    () => {
      const container = previousContainerRef.value;
      if (!container || !previousContentNode.value) {
        return;
      }
      container.replaceChildren(...Array.from(previousContentNode.value.childNodes));
    },
    {flush: 'post', immediate: true},
  );

  // Adaptive origin middleware registration.
  watch(
    () => store,
    () => {
      store.set('adaptiveOrigin', adaptiveOrigin);
      return () => {
        store.set('adaptiveOrigin', undefined);
      };
    },
    {flush: 'post', immediate: true},
  );

  const isTransitioning = () => previousContentNode.value != null;

  let childrenToRender: any;
  if (!isTransitioning()) {
    childrenToRender = (
      <div
        data-current
        ref={(el: HTMLDivElement | null) => {
          currentContainerRef.value = el;
        }}
        key={currentContentKey.value}
      >
        {children}
      </div>
    );
  } else {
    childrenToRender = (
      <>
        <div
          data-previous
          ref={(el: HTMLDivElement | null) => {
            previousContainerRef.value = el;
          }}
          style={{position: 'absolute'} as any}
          key="previous"
          data-ending-style={showStartingStyleAttribute.value ? undefined : ''}
        />
        <div
          data-current
          ref={(el: HTMLDivElement | null) => {
            currentContainerRef.value = el;
          }}
          key={currentContentKey.value}
          data-starting-style={showStartingStyleAttribute.value ? '' : undefined}
        >
          {children}
        </div>
      </>
    ) as any;
  }

  const state: PopupViewportState = {
    activationDirection: undefined,
    transitioning: isTransitioning(),
  };

  return {children: childrenToRender, state};
}

type Offset = {
  horizontal: number;
  vertical: number;
};

/**
 * Returns a key that forces remounting content when triggers change or a payload is updated.
 * (actview 版：ref 快照 + watch flush post。）
 */
function usePopupContentKey(
  activeTriggerId: ComputedRef<string | null>,
  payload: ComputedRef<unknown>,
): ComputedRef<string> {
  const contentKey = ref(0);
  const previousActiveTriggerIdRef = ref(activeTriggerId.value);
  const previousPayloadRef = ref(payload.value);
  const pendingPayloadUpdateRef = ref(false);

  watch(
    () => [activeTriggerId.value, payload.value] as const,
    ([activeTriggerIdValue, payloadValue]) => {
      const previousActiveTriggerId = previousActiveTriggerIdRef.value;
      const previousPayload = previousPayloadRef.value;
      const triggerIdChanged = activeTriggerIdValue !== previousActiveTriggerId;
      const payloadChanged = payloadValue !== previousPayload;

      if (triggerIdChanged) {
        contentKey.value += 1;
        pendingPayloadUpdateRef.value = !payloadChanged;
      } else if (pendingPayloadUpdateRef.value && payloadChanged) {
        contentKey.value += 1;
        pendingPayloadUpdateRef.value = false;
      }

      previousActiveTriggerIdRef.value = activeTriggerIdValue;
      previousPayloadRef.value = payloadValue;
    },
    {flush: 'post', immediate: true},
  );

  return {
    get value() {
      return `${activeTriggerId.value ?? 'current'}-${contentKey.value}`;
    },
  } as ComputedRef<string>;
}

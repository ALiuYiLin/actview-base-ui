import { ref, unref } from 'actview';
import type { Ref } from '@actview/core';
import {
  useEnhancedClickHandler,
  type InteractionType,
} from '@base-ui/actview-utils/useEnhancedClickHandler';
import { platform } from '@base-ui/actview-utils/platform';
import { useValueChanged } from '../internals/useValueChanged';

type MaybeRef<T> = T | Ref<T>;

export function useOpenMethodTriggerProps(
  open: boolean | (() => boolean) | Ref<boolean>,
  setOpenMethod: (interactionType: InteractionType | null) => void,
) {
  const handleTriggerClick = (
    _event: MouseEvent | PointerEvent,
    interactionType: InteractionType,
  ) => {
    const isOpen = typeof open === 'function' ? open() : unref(open);

    if (!isOpen) {
      setOpenMethod(
        interactionType ||
          // On iOS Safari, the hitslop around touch targets means tapping outside an element's
          // bounds does not fire `pointerdown` but does fire `mousedown`. The `interactionType`
          // will be "" in that case.
          (platform.os.ios ? 'touch' : ''),
      );
    }
  };

  const { onClick, onPointerDown } = useEnhancedClickHandler(handleTriggerClick);

  return { onClick, onPointerDown };
}

/**
 * Determines the interaction type (keyboard, mouse, touch, etc.) that opened the component.
 *
 * @param open The open state of the component.
 */
export function useOpenInteractionType(open: MaybeRef<boolean>) {
  const openMethod = ref<InteractionType | null>(null);

  const triggerProps = useOpenMethodTriggerProps(open, (value) => {
    openMethod.value = value;
  });

  useValueChanged(open, (previousOpen) => {
    if (previousOpen && !unref(open)) {
      openMethod.value = null;
    }
  });

  return { openMethod, triggerProps };
}

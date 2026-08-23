import { ref, watch } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import { InteractionType, useEnhancedClickHandler } from '@/utils/useEnhancedClickHandler';
import { platform } from '@/utils/platform';
import { useStableCallback } from '@/utils/useStableCallback';

export function useOpenMethodTriggerProps(
  open: boolean | (() => boolean),
  setOpenMethod: (interactionType: InteractionType | null) => void,
) {
  const handleTriggerClick = useStableCallback(
    (_: any, interactionType: InteractionType) => {
      const isOpen = typeof open === 'function' ? open() : open;

      if (!isOpen) {
        setOpenMethod(
          interactionType ||
            // On iOS Safari, the hitslop around touch targets means tapping outside an element's
            // bounds does not fire `pointerdown` but does fire `mousedown`. The `interactionType`
            // will be "" in that case.
            (platform.os.ios ? 'touch' : ''),
        );
      }
    },
  );

  const {onClick, onPointerDown} = useEnhancedClickHandler(handleTriggerClick);

  return {
    onClick,
    onPointerDown,
  };
}

/**
 * Determines the interaction type (keyboard, mouse, touch, etc.) that opened the component.
 * (actview 版：open 可为 ComputedRef；openMethod 返回 Ref<InteractionType | null> 读 .value。)
 */
export function useOpenInteractionType(open: boolean | ComputedRef<boolean>) {
  const openMethod = ref<InteractionType | null>(null);
  const setOpenMethod = (interactionType: InteractionType | null) => {
    openMethod.value = interactionType;
  };

  const isOpen = typeof open === 'function' || typeof open === 'boolean' ? open : open.value;

  const triggerProps = useOpenMethodTriggerProps(isOpen as boolean | (() => boolean), setOpenMethod);

  const openValue = typeof open === 'object' ? open : null;
  if (openValue) {
    watch(
      () => openValue.value,
      (next, previous) => {
        if (previous && !next) {
          setOpenMethod(null);
        }
      },
      {flush: 'post'},
    );
  }

  return {
    openMethod,
    triggerProps,
  };
}

import { ref, watch } from 'actview';
import { ownerDocument } from '@/internals/owner';
import { useScrollLock } from '@/utils/useScrollLock';

// Touch-opened popups normally avoid scroll locking so users can still swipe outside to dismiss.
// This hook re-enables scroll lock only when the popup is effectively full-width.
const VIEWPORT_WIDTH_TOLERANCE_PX = 20;

/**
 * Manages scroll lock for anchored popups. For non-touch opens, scroll lock is applied when
 * enabled. For touch opens, scroll lock is applied only when the positioner width is effectively
 * viewport-sized.
 * (actview 版：React useState → ref。)
 */
export function useAnchoredPopupScrollLock(
  enabled: boolean,
  touchOpen: boolean,
  positionerElement: HTMLElement | null,
  referenceElement: Element | null,
) {
  const touchOpenShouldLockScroll = ref(false);

  watch(
    () => [enabled, touchOpen, positionerElement] as const,
    () => {
      if (!enabled || !touchOpen || positionerElement == null) {
        touchOpenShouldLockScroll.value = false;
        return;
      }

      const viewportWidth = ownerDocument(positionerElement).documentElement.clientWidth;
      const popupWidth = positionerElement.offsetWidth;

      touchOpenShouldLockScroll.value =
        viewportWidth > 0 &&
        popupWidth > 0 &&
        popupWidth >= viewportWidth - VIEWPORT_WIDTH_TOLERANCE_PX;
    },
    {flush: 'post', immediate: true},
  );

  useScrollLock(enabled && (!touchOpen || touchOpenShouldLockScroll.value), referenceElement);
}

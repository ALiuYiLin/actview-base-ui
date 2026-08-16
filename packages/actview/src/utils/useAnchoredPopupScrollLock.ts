import { ref, unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useScrollLock } from '@base-ui/actview-utils/useScrollLock';

type MaybeRef<T> = T | Ref<T>;

// Touch-opened popups normally avoid scroll locking so users can still swipe outside to dismiss.
// This hook re-enables scroll lock only when the popup is effectively full-width.
// Treat popups with up to 20px of total horizontal gutter as full-width so common ~10px side
// padding still locks scroll, since that leaves too little outside space for a reliable swipe.
const VIEWPORT_WIDTH_TOLERANCE_PX = 20;

/**
 * Manages scroll lock for anchored popups. For non-touch opens, scroll lock is applied when
 * enabled. For touch opens, scroll lock is applied only when the positioner width is effectively
 * viewport-sized.
 */
export function useAnchoredPopupScrollLock(
  enabled: MaybeRef<boolean>,
  touchOpen: MaybeRef<boolean>,
  positionerElement: MaybeRef<HTMLElement | null>,
  referenceElement: MaybeRef<Element | null>,
) {
  const touchOpenShouldLockScroll = ref(false);

  watch(
    [() => unref(enabled), () => unref(touchOpen), () => unref(positionerElement)],
    ([isEnabled, isTouchOpen, positionerEl]) => {
      if (!isEnabled || !isTouchOpen || positionerEl == null) {
        touchOpenShouldLockScroll.value = false;
        return;
      }

      const viewportWidth = ownerDocument(positionerEl).documentElement.clientWidth;
      const popupWidth = positionerEl.offsetWidth;

      touchOpenShouldLockScroll.value =
        viewportWidth > 0 &&
        popupWidth > 0 &&
        popupWidth >= viewportWidth - VIEWPORT_WIDTH_TOLERANCE_PX;
    },
    { immediate: true, flush: 'post' },
  );

  useScrollLock(
    () => unref(enabled) && (!unref(touchOpen) || touchOpenShouldLockScroll.value),
    referenceElement,
  );
}

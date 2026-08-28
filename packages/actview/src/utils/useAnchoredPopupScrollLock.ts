import { computed, ref, toValue, watch } from 'actview';
import type { MaybeRefOrGetter } from '@/internals/types';
import { ownerDocument } from '@/internals/owner';
import { useScrollLock } from '@/utils/useScrollLock';

// Touch-opened popups normally avoid scroll locking so users can still swipe outside to dismiss.
// This hook re-enables scroll lock only when the popup is effectively full-width.
const VIEWPORT_WIDTH_TOLERANCE_PX = 20;

/**
 * Manages scroll lock for anchored popups. For non-touch opens, scroll lock is applied when
 * enabled. For touch opens, scroll lock is applied only when the positioner width is effectively
 * viewport-sized.
 * (actview 版：React useState → ref。参数支持 ref/computed——一次性 setup 下
 * 快照布尔会让锁随 open 变化失效。)
 */
export function useAnchoredPopupScrollLock(
  enabled: MaybeRefOrGetter<boolean>,
  touchOpen: MaybeRefOrGetter<boolean>,
  positionerElement: HTMLElement | null | {value: HTMLElement | null},
  referenceElement: Element | null | {value: Element | null},
) {
  const touchOpenShouldLockScroll = ref(false);

  const enabledValue = computed(() => toValue(enabled));
  const touchOpenValue = computed(() => toValue(touchOpen));
  const positionerElementValue = computed(() =>
    positionerElement != null && 'value' in positionerElement
      ? positionerElement.value
      : positionerElement,
  );
  const referenceElementValue = computed(() =>
    referenceElement != null && 'value' in referenceElement
      ? referenceElement.value
      : referenceElement,
  );

  watch(
    () => [enabledValue.value, touchOpenValue.value, positionerElementValue.value] as const,
    () => {
      if (!enabledValue.value || !touchOpenValue.value || positionerElementValue.value == null) {
        touchOpenShouldLockScroll.value = false;
        return;
      }

      const viewportWidth = ownerDocument(positionerElementValue.value).documentElement.clientWidth;
      const popupWidth = positionerElementValue.value.offsetWidth;

      touchOpenShouldLockScroll.value =
        viewportWidth > 0 &&
        popupWidth > 0 &&
        popupWidth >= viewportWidth - VIEWPORT_WIDTH_TOLERANCE_PX;
    },
    {flush: 'post', immediate: true},
  );

  const shouldLock = computed(
    () => enabledValue.value && (!touchOpenValue.value || touchOpenShouldLockScroll.value),
  );
  // useScrollLock 以 watch 源数组项追踪 ref/computed 项。
  useScrollLock(shouldLock as any, referenceElementValue as any);
}

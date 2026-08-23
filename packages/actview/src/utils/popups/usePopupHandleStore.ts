import { ref, onUnmounted } from 'actview';
import { NOOP } from '@/utils/empty';
import type { PopupHandleStoreProvider } from './popupHandle';

/**
 * Reads the store currently exposed by a popup handle and subscribes to store-pointer changes.
 * Detached triggers use this to follow a handle as a root attaches or detaches.
 *
 * Returns `undefined` when no handle is provided so callers can fall back to their root context.
 * (actview 版：useSyncExternalStore → ref + subscribe；返回 {value}。)
 *
 * @param handle The popup handle to read from, or `undefined` when the trigger is not handle-bound.
 */
export function usePopupHandleStore<HandleStore>(
  handle: PopupHandleStoreProvider<HandleStore> | undefined,
): {value: HandleStore | undefined} {
  const storeRef = ref<HandleStore | undefined>(handle === undefined ? undefined : handle.store);

  if (handle !== undefined) {
    const unsubscribe = handle.subscribeStore(() => {
      storeRef.value = handle.store;
    });
    onUnmounted(unsubscribe);
  } else {
    onUnmounted(NOOP);
  }

  return storeRef;
}

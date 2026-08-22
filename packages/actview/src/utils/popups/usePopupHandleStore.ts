import { shallowRef, watch } from 'actview';
import type { Ref } from '@actview/core';
import { NOOP } from '@base-ui/actview-utils/empty';
import type { PopupHandleStoreProvider } from '@/utils/popups/popupHandle';

/**
 * Reads the store currently exposed by a popup handle and subscribes to store-pointer changes.
 * Detached triggers use this to follow a handle as a root attaches or detaches: while no root is
 * attached, the handle exposes its fallback store; once a root attaches, subscribers re-render and
 * read from the live root store.
 *
 * Returns a ref holding `undefined` when no handle is provided so callers can fall back to their
 * root context. Read `.value` inside render functions.
 *
 * ActView has no hydration phase, so the React version's `serverStore` snapshot (used by
 * `useSyncExternalStore`'s third argument) has no equivalent and is omitted.
 *
 * @param handle The popup handle to read from, or `undefined` when the trigger is not handle-bound.
 */
export function usePopupHandleStore<HandleStore>(
  handle: PopupHandleStoreProvider<HandleStore> | undefined,
): Ref<HandleStore | undefined> {
  const store = shallowRef<HandleStore | undefined>(handle?.store);

  watch(
    () => handle,
    (currentHandle, _old, onCleanup) => {
      const unsubscribe =
        currentHandle === undefined ? NOOP : currentHandle.subscribeStore(onStoreChange);

      function onStoreChange() {
        store.value = currentHandle?.store;
      }

      store.value = currentHandle?.store;
      onCleanup(unsubscribe);
    },
    { immediate: true },
  );

  return store;
}

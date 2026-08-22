import { watch } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { useOnMount } from '@base-ui/actview-utils/useOnMount';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { ToastContext } from '@/toast/provider/ToastProviderContext';
import type { ToastManager, ToastManagerEvent } from '@/toast/createToastManager';
import { ToastStore } from '@/toast/store';

/**
 * Provides a context for creating and managing toasts.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastProvider(componentProps: ToastProvider.Props) {
  const { toastManager, timeout = 5000, limit = 3 } = componentProps;

  const store = useRefWithInit(
    () =>
      new ToastStore({
        timeout,
        limit,
        viewport: null,
        toasts: [],
        hovering: false,
        focused: false,
        isWindowFocused: true,
        prevFocusElement: null,
      }),
  ).current;

  useOnMount(store.disposeEffect);

  watch(
    () => componentProps.toastManager,
    (manager, _old, onCleanup) => {
      if (!manager) {
        return;
      }

      const unsubscribe = manager[' subscribe']((data: ToastManagerEvent) => {
        const { action, options } = data;
        const id = options.id;

        if (action === 'promise' && options.promise) {
          store.promiseToast(options.promise, options);
        } else if (action === 'update' && id) {
          store.updateToast(id, options);
        } else if (action === 'close') {
          store.closeToast(id);
        } else {
          store.addToast(options);
        }
      });

      onCleanup(() => {
        unsubscribe();
      });
    },
    { immediate: true },
  );

  // `limit` needs custom syncing because changing it must also recompute each
  // toast's `limited` flag; a plain `useSyncedValues` would only update the raw value.
  watch(
    [() => componentProps.timeout ?? 5000, () => componentProps.limit ?? 3],
    ([nextTimeout, nextLimit]) => {
      store.syncProviderProps(nextTimeout, nextLimit);
    },
    { immediate: true },
  );

  return <ToastContext.Provider value={store}>{componentProps.children}</ToastContext.Provider>;
}

export interface ToastProviderState {}

export interface ToastProviderProps {
  children?: VNodeChild;
  /**
   * The default amount of time (in ms) before a toast is auto dismissed.
   * A value of `0` will prevent the toast from being dismissed automatically.
   * @default 5000
   */
  timeout?: number | undefined;
  /**
   * The maximum number of toasts that can be displayed at once.
   * When the limit is exceeded, the oldest toasts are marked as `limited` (via the `data-limited`
   * attribute) rather than removed, so they can be hidden or animated out.
   * @default 3
   */
  limit?: number | undefined;
  /**
   * A global manager for toasts to use outside of a React component.
   */
  toastManager?: ToastManager | undefined;
}

export namespace ToastProvider {
  export type State = ToastProviderState;
  export type Props = ToastProviderProps;
}

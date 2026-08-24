import { useToastProviderContext } from './provider/ToastProviderContext';
import type { ToastManagerAddOptions, ToastManagerPromiseOptions, ToastManagerUpdateOptions } from './store';
import type { Ref } from 'actview';

/**
 * Returns the array of toasts and methods to manage them.
 */
export function useToastManager<Data extends object = any>(): UseToastManagerReturnValue<Data> {
  const store = useToastManagerStore();

  const toasts = store.useState('toasts');

  return {
    toasts: toasts.value,
    add: (options) => store.addToast(options),
    close: (toastId) => store.closeToast(toastId),
    update: (id, updates) => store.updateToast(id, updates),
    promise: (options) => store.promiseToast(options),
  };
}

function useToastManagerStore() {
  const store = useToastProviderContext(false);
  return store;
}

export interface ToastObject<Data extends object = any> {
  /**
   * The unique identifier for the toast.
   */
  id: string;
  /**
   * The ref for the toast.
   */
  ref?: Ref<HTMLElement | null> | undefined;
  /**
   * The title of the toast.
   */
  title?: any;
  /**
   * The type of the toast.
   */
  type?: string | undefined;
  /**
   * The description of the toast.
   */
  description?: any;
  /**
   * Duration in milliseconds for the toast to remain visible.
   */
  timeout?: number | undefined;
  /**
   * The priority of the toast.
   */
  priority?: 'low' | 'high' | undefined;
  /**
   * The transition status of the toast.
   */
  transitionStatus?: 'starting' | 'ending' | undefined;
  /**
   * The update key of the toast.
   */
  updateKey?: number | undefined;
  /**
   * Whether the toast is limited.
   */
  limited?: boolean | undefined;
  /**
   * The height of the toast.
   */
  height?: number | undefined;
  /**
   * Callback fired when the toast is closed.
   */
  onClose?: (() => void) | undefined;
  /**
   * Callback fired when the toast is removed.
   */
  onRemove?: (() => void) | undefined;
  /**
   * Props for the toast action.
   */
  actionProps?: Record<string, any> | undefined;
  /**
   * Data attached to the toast.
   */
  data?: Data | undefined;
}

export interface UseToastManagerReturnValue<Data extends object> {
  /**
   * The array of toasts.
   */
  toasts: ToastObject<Data>[];
  /**
   * Adds a toast and returns its id.
   */
  add: (options: ToastManagerAddOptions<Data>) => string;
  /**
   * Closes a toast (or all toasts if no id is given).
   */
  close: (toastId?: string) => void;
  /**
   * Updates a toast.
   */
  update: (id: string, updates: ToastManagerUpdateOptions<Data>) => void;
  /**
   * Shows a toast based on a promise.
   */
  promise: <Value>(
    options: ToastManagerPromiseOptions<Value, Data>,
  ) => Promise<Value>;
}

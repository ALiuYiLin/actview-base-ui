import { ReactStore } from '@/internals/store';
import { ref } from 'actview';

export interface ToastObject<Data extends object = any> {
  id: string;
  title?: any;
  type?: string | undefined;
  description?: any;
  timeout?: number | undefined;
  priority?: 'low' | 'high' | undefined;
  transitionStatus?: 'starting' | 'ending' | undefined;
  updateKey?: number | undefined;
  limited?: boolean | undefined;
  height?: number | undefined;
  onClose?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  actionProps?: Record<string, any> | undefined;
  positionerProps?: Record<string, any> | undefined;
  data?: Data | undefined;
}

export type StoredToast<Data extends object = any> = ToastObject<Data> & { updateKey: number };

export type State<Data extends object = any> = {
  toasts: StoredToast<Data>[];
  hovering: boolean;
  focused: boolean;
  timeout: number;
  limit: number;
  isWindowFocused: boolean;
  viewport: HTMLElement | null;
  prevFocusElement: HTMLElement | null;
};

export interface ToastManagerAddOptions<Data extends object = any>
  extends Partial<Omit<ToastObject<Data>, 'id'>> {
  id?: string | undefined;
}

export interface ToastManagerUpdateOptions<Data extends object = any>
  extends Partial<Omit<ToastObject<Data>, 'id' | 'updateKey' | 'data'>> {
  data?: Partial<Data> | undefined;
}

export type ToastManagerPromiseOptions<Value, Data extends object> = {
  promise: Promise<Value>;
  success: Partial<ToastObject<Data>> & {data?: Data | undefined};
  error: Partial<ToastObject<Data>> & {data?: Data | undefined};
  pending?: Partial<ToastObject<Data>> | undefined;
};

export interface ToastManager<Data extends object = any> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => State<Data>;
  add<T extends Data = Data>(options: ToastManagerAddOptions<T>): string;
  close: (toastId?: string | undefined) => void;
  update: <T extends Data = Data>(id: string, updates: ToastManagerUpdateOptions<T>) => void;
  promise: <Value, T extends Data = Data>(
    options: ToastManagerPromiseOptions<Value, T>,
  ) => Promise<Value>;
}

let idCounter = 0;
function generateId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const selectors = {
  toasts: (state: State) => state.toasts,
  isEmpty: (state: State) => state.toasts.length === 0,
};

type Selectors = typeof selectors;

/**
 * The store that holds the list of toasts and manages their lifecycle.
 *
 * actview 简化：closeToast 直接移除（无 ending 过渡阶段）；
 * promiseToast 提供基础成功/错误/挂起状态；metadata/offsetY 布局信息未迁移。
 */
export class ToastStore<Data extends object = any> extends ReactStore<
  Readonly<State<Data>>,
  {},
  Selectors
> {
  constructor(initialState: Partial<State<Data>> = {}) {
    const state: State<Data> = {
      toasts: [],
      hovering: false,
      focused: false,
      timeout: 4000,
      limit: Infinity,
      isWindowFocused: true,
      viewport: null,
      prevFocusElement: null,
      ...initialState,
    };
    super(state, {}, selectors);
  }

  addToast<T extends Data = Data>(toast: ToastManagerAddOptions<T>): string {
    const id = toast.id || generateId('toast');
    const newToast: StoredToast<T> = {
      ...(toast as any),
      id,
      updateKey: 0,
    };
    this.setState({...this.state, toasts: [...this.state.toasts, newToast] as any});
    return id;
  }

  updateToast<T extends Data = Data>(id: string, updates: ToastManagerUpdateOptions<T>) {
    this.setState({
      ...this.state,
      toasts: this.state.toasts.map((toast) =>
        toast.id === id
          ? ({
              ...toast,
              ...(updates as any),
              updateKey: toast.updateKey + 1,
            } as any)
          : toast,
      ) as any,
    });
  }

  closeToast(toastId?: string) {
    const {toasts} = this.state;
    const nextToasts = toastId
      ? toasts.filter((toast) => toast.id !== toastId)
      : [];

    toasts.forEach((toast) => {
      if (!toastId || toast.id === toastId) {
        toast.onClose?.();
      }
    });

    this.setState({...this.state, toasts: nextToasts});
  }

  promiseToast<Value, T extends Data = Data>(
    options: ToastManagerPromiseOptions<Value, T>,
  ): Promise<Value> {
    if (options.pending) {
      this.addToast({...(options.pending as any)});
    }

    return options.promise
      .then((value) => {
        if (options.success) {
          this.addToast({...(options.success as any)});
        }
        return value;
      })
      .catch((error) => {
        if (options.error) {
          this.addToast({...(options.error as any)});
        }
        throw error;
      });
  }
}

/**
 * Creates a new toast manager that works without a `Toast.Provider` (imperative usage).
 */
export function createToastManager<Data extends object = any>(): ToastManager<Data> {
  const store = new ToastStore<Data>();
  return {
    subscribe: (listener) => {
      const unsub = store.subscribe(listener);
      return unsub;
    },
    getSnapshot: () => store.state as State<Data>,
    add: (options) => store.addToast(options),
    close: (toastId) => store.closeToast(toastId),
    update: (id, updates) => store.updateToast(id, updates),
    promise: (options) => store.promiseToast(options),
  };
}

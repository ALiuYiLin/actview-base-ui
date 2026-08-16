import { onUnmounted, unref, watch, type Ref } from '@actview/core';
import { Store } from './Store';
import { useStore } from './useStore';
import { NOOP } from '../empty';

type MaybeRef<T> = T | Ref<T>;

/**
 * A Store that supports controlled state keys, non-reactive values and provides utility methods for ActView.
 */
export class ActviewStore<
  State extends object,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> extends Store<State> {
  /**
   * Creates a new ActviewStore instance.
   *
   * @param state Initial state of the store.
   * @param context Non-reactive context values.
   * @param selectors Optional selectors for use with `useState`.
   */
  constructor(state: State, context: Context = {} as Context, selectors?: Selectors) {
    super(state);
    this.context = context;
    this.selectors = selectors;
  }

  /**
   * Non-reactive values such as refs, callbacks, etc.
   */
  readonly context: Context;

  private selectors: Selectors | undefined;

  /**
   * Synchronizes a single external value into the store.
   *
   * The value may be a ref (the common case in ActView); it is unwrapped for comparison.
   * Note that while the value in `state` is updated immediately, the refs returned by
   * `useState` update when the store notifies subscribers.
   */
  useSyncedValue<Key extends keyof State>(key: Key, value: MaybeRef<State[Key]>) {
    // eslint-disable-next-line consistent-this
    const store = this;
    watch(
      () => unref(value),
      (nextValue) => {
        if (!Object.is(store.state[key], nextValue)) {
          store.set(key, nextValue);
        }
      },
      { immediate: true },
    );
  }

  /**
   * Synchronizes a single external value into the store and
   * cleans it up (sets to `undefined`) on unmount.
   */
  public useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<State>>(
    key: Key,
    value: MaybeRef<State[Key]>,
  ) {
    // eslint-disable-next-line consistent-this
    const store = this;
    watch(
      () => unref(value),
      (nextValue) => {
        if (!Object.is(store.state[key], nextValue)) {
          store.set(key, nextValue);
        }
      },
      { immediate: true },
    );
    onUnmounted(() => {
      store.set(key, undefined as State[Key]);
    });
  }

  /**
   * Synchronizes multiple external values into the store.
   * Each value must match its state key. Pass an exact known subset rather than a broad
   * `Partial<State>`, which may contain `undefined` for required state fields.
   *
   * Values may be refs; each is watched individually.
   *
   * @param statePart An exact subset of state fields to synchronize. Unknown keys are not accepted.
   */
  public useSyncedValues<const Key extends keyof State>(statePart: {
    [K in Key]: MaybeRef<State[K]>;
  }) {
    // eslint-disable-next-line consistent-this
    const store = this;
    for (const key of Object.keys(statePart) as Key[]) {
      const value = statePart[key];
      watch(
        () => unref(value),
        (nextValue) => {
          if (!Object.is(store.state[key], nextValue)) {
            store.set(key, nextValue);
          }
        },
        { immediate: true },
      );
    }
  }

  /**
   * Registers a controllable prop pair (`controlled`, `defaultValue`) for a specific key. If `controlled`
   * is non-undefined, the store's state at `key` is updated to match `controlled`.
   */
  useControlledProp<Key extends keyof State>(
    key: Key,
    controlled: MaybeRef<State[Key] | undefined>,
  ): void {
    // eslint-disable-next-line consistent-this
    const store = this;
    const isControlled = () => unref(controlled) !== undefined;

    watch(
      () => unref(controlled),
      (nextControlled) => {
        if (nextControlled !== undefined && !Object.is(store.state[key], nextControlled)) {
          // Set the internal state to match the controlled value.
          store.setState({ ...store.state, [key]: nextControlled });
        }
      },
      { immediate: true },
    );

    if (process.env.NODE_ENV !== 'production') {
      // The setup runs only once, so a single check is enough to detect mode switches
      // triggered by prop updates arriving through the controlled ref.
      watch(
        () => unref(controlled) !== undefined,
        (nowControlled, wasControlled) => {
          if (wasControlled !== nowControlled) {
            console.error(
              `A component is changing the ${
                nowControlled ? '' : 'un'
              }controlled state of ${String(key)} to be ${nowControlled ? 'un' : ''}controlled. Elements should not switch from uncontrolled to controlled (or vice versa).`,
            );
          }
        },
      );
    }
  }

  /** Gets the current value from the store using a selector with the provided key.
   *
   * This is a non-reactive read; use `useState` to subscribe.
   *
   * @param key Key of the selector to use.
   */
  select<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ReturnType<Selectors[Key]>;

  select(key: keyof Selectors, a1?: unknown, a2?: unknown, a3?: unknown) {
    const selector = this.selectors![key];
    return selector(this.state, unref(a1), unref(a2), unref(a3));
  }

  /**
   * Returns a ref that tracks the value from the store's state using a selector function.
   * The ref's `.value` is updated whenever the selected state changes.
   *
   * @param key Key of the selector to use.
   */
  useState<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): Ref<ReturnType<Selectors[Key]>>;

  useState(key: keyof Selectors, a1?: unknown, a2?: unknown, a3?: unknown) {
    return useStore(this, this.selectors![key], a1, a2, a3);
  }

  /**
   * Assigns a function to the store context.
   *
   * ActView closures are stable, so the function is assigned directly.
   *
   * @param key Key of the context callback. Must be a function in the context.
   * @param fn Function to assign.
   */
  useContextCallback<Key extends ContextFunctionKeys<Context>>(
    key: Key,
    fn: ContextFunction<Context, Key> | undefined,
  ) {
    (this.context as Record<Key, ContextFunction<Context, Key>>)[key] =
      fn ?? (NOOP as ContextFunction<Context, Key>);
  }

  /**
   * Returns a stable setter function for a specific key in the store's state.
   *
   * @param key Key of the state to set.
   */
  useStateSetter<const Key extends keyof State>(key: Key) {
    return (value: State[Key]) => {
      this.set(key, value);
    };
  }

  /**
   * Observes changes derived from the store's selectors and calls the listener when the selected value changes.
   *
   * @param key Key of the selector to observe.
   * @param listener Listener function called when the selector result changes.
   */
  observe<Key extends keyof Selectors>(
    selector: Key,
    listener: (
      newValue: ReturnType<Selectors[Key]>,
      oldValue: ReturnType<Selectors[Key]>,
      store: this,
    ) => void,
  ): () => void;

  observe<Selector extends ObserveSelector<State>>(
    selector: Selector,
    listener: (newValue: ReturnType<Selector>, oldValue: ReturnType<Selector>, store: this) => void,
  ): () => void;

  observe(
    selector: keyof Selectors | ObserveSelector<State>,
    listener: (newValue: any, oldValue: any, store: this) => void,
  ) {
    let selectFn: ObserveSelector<State>;

    if (typeof selector === 'function') {
      selectFn = selector;
    } else {
      selectFn = this.selectors![selector] as ObserveSelector<State>;
    }

    let prevValue = selectFn(this.state);

    listener(prevValue, prevValue, this);

    return this.subscribe((nextState) => {
      const nextValue = selectFn(nextState);
      if (!Object.is(prevValue, nextValue)) {
        const oldValue = prevValue;
        prevValue = nextValue;
        listener(nextValue, oldValue, this);
      }
    });
  }
}

type MaybeCallable = (...args: any[]) => any;

type ContextFunctionKeys<Context> = {
  [Key in keyof Context]-?: Extract<Context[Key], MaybeCallable> extends never ? never : Key;
}[keyof Context];

type ContextFunction<Context, Key extends keyof Context> = Extract<Context[Key], MaybeCallable>;

type KeysAllowingUndefined<State> = {
  [Key in keyof State]-?: undefined extends State[Key] ? Key : never;
}[keyof State];

type ObserveSelector<State> = (state: State) => any;

type SelectorFunction<State> = (state: State, ...args: any[]) => any;

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;

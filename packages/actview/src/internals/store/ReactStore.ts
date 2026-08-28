import { computed, onUnmounted, toValue, watch } from 'actview';
import type { ComputedRef } from 'actview';
import { Store } from './Store';
import { useStore } from './useStore';
import { NOOP } from '@/internals/noop';

/**
 * A Store that supports controlled state keys, non-reactive values and provides utility methods.
 * (actview 版：React hook 方法 → watch/computed 语义；useState 返回 ComputedRef。)
 */
export class ReactStore<
  State extends object,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> extends Store<State> {
  /**
   * Creates a new ReactStore instance.
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
   * (支持 ref/computed 作为 value：watch 追踪 .value 变化。)
   */
  useSyncedValue<Key extends keyof State>(key: Key, value: State[Key]) {
    // eslint-disable-next-line consistent-this
    const store = this;
    watch(
      () => toValue(value as any),
      () => {
        const next = toValue(value as any);
        if (store.state[key] !== next) {
          store.set(key, next);
        }
      },
      {flush: 'post', immediate: true},
    );
  }

  /**
   * Synchronizes a single external value into the store and
   * cleans it up (sets to `undefined`) on unmount.
   */
  public useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<State>>(
    key: Key,
    value: State[Key],
  ) {
    // eslint-disable-next-line consistent-this
    const store = this;
    watch(
      () => toValue(value as any),
      () => {
        const next = toValue(value as any);
        if (store.state[key] !== next) {
          store.set(key, next);
        }
      },
      {flush: 'post', immediate: true},
    );
    onUnmounted(() => {
      store.set(key, undefined as State[Key]);
    });
  }

  /**
   * Synchronizes multiple external values into the store.
   * (值可为 ref/computed——watch 源逐字段解包 `.value` 以建立追踪；回调内做
   * 逐键 Object.is 比较，值未变时跳过 update，避免「新对象源→每 tick update
   * →重渲染→再触发」的循环。)
   */
  public useSyncedValues<const Key extends keyof State>(statePart: Pick<State, Key>) {
    // eslint-disable-next-line consistent-this
    const store = this;
    const isRefLike = (v: unknown): v is {value: unknown} =>
      v != null && typeof v === 'object' && (v as any).__v_isRef === true;
    let previous: Record<string, unknown> | null = null;
    watch(
      () => {
        const out: Record<string, unknown> = {};
        for (const key in statePart) {
          const v = (statePart as Record<string, unknown>)[key];
          out[key] = isRefLike(v) ? v.value : v;
        }
        return out;
      },
      (resolved) => {
        if (
          previous !== null &&
          Object.keys(resolved).every((k) => Object.is(previous![k], resolved[k]))
        ) {
          return;
        }
        previous = resolved;
        store.update(resolved as unknown as Pick<State, Key>);
      },
      {flush: 'post', immediate: true},
    );
  }

  /**
   * Registers a controllable prop pair (`controlled`, `defaultValue`) for a specific key. If `controlled`
   * is non-undefined, the store's state at `key` is updated to match `controlled`.
   * `controlled` may also be a getter `() => value` (see PD-15: setup-destructured props are snapshots,
   * so callers pass `() => props.x` to make the watch track the props proxy).
   */
  useControlledProp<Key extends keyof State>(
    key: Key,
    controlled: State[Key] | undefined | (() => State[Key] | undefined),
  ): void {
    // eslint-disable-next-line consistent-this
    const store = this;

    // 支持 getter/ref 形态（PD-15：setup 解构的 props 是快照，受控值后续
    // 变化不会触发 watch——传 () => props.x 让 watch 追踪 props 代理）。
    watch(
      () => (typeof controlled === 'function' ? (controlled as any)() : controlled),
      (value) => {
        if (value !== undefined && !Object.is(store.state[key], value)) {
          // Set the internal state to match the controlled value.
          store.setState({...store.state, [key]: value as State[Key]});
        }
      },
      {flush: 'post', immediate: true},
    );
  }

  /** Gets the current value from the store using a selector with the provided key. */
  select<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ReturnType<Selectors[Key]>;

  select(key: keyof Selectors, a1?: unknown, a2?: unknown, a3?: unknown) {
    const selector = this.selectors![key];
    return selector(this.state, a1, a2, a3);
  }

  /**
   * Returns a value from the store's state using a selector function.
   * This method causes a recompute whenever the selected state changes.
   * (actview：返回 ComputedRef，消费方读 `.value`。)
   */
  useState<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ComputedRef<ReturnType<Selectors[Key]>>;

  useState(key: keyof Selectors, a1?: unknown, a2?: unknown, a3?: unknown): ComputedRef<unknown> {
    return useStore(this, this.selectors![key], a1, a2, a3);
  }

  /**
   * Wraps a function with a stable reference and assigns it to the context.
   */
  useContextCallback<Key extends ContextFunctionKeys<Context>>(
    key: Key,
    fn: ContextFunction<Context, Key> | undefined,
  ) {
    const stableFunction = fn ?? (NOOP as ContextFunction<Context, Key>);
    (this.context as Record<Key, ContextFunction<Context, Key>>)[key] = stableFunction;
  }

  /**
   * Returns a stable setter function for a specific key in the store's state.
   */
  useStateSetter<const Key extends keyof State>(key: Key) {
    // eslint-disable-next-line consistent-this
    const store = this;
    return (value: State[Key]) => {
      store.set(key, value);
    };
  }

  /**
   * Observes changes derived from the store's selectors and calls the listener when the selected value changes.
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

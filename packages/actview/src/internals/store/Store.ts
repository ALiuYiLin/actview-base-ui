type Listener<T> = (state: T) => void;

export type ReadonlyStore<State> = Pick<Store<State>, 'subscribe' | 'getSnapshot'>;

/**
 * A data store implementation that allows subscribing to state changes and updating the state.
 * It uses an observer pattern to notify subscribers when the state changes.
 * (actview 版：与 React 版相同的观察者语义；`useState` 订阅在 useStore 中实现。)
 */
export class Store<State> {
  /**
   * The current state of the store.
   */
  state: State;

  private listeners: Set<Listener<State>>;

  // Internal state to handle recursive `setState()` calls
  private updateTick: number;

  constructor(state: State) {
    this.state = state;
    this.listeners = new Set();
    this.updateTick = 0;
  }

  /**
   * Registers a listener that will be called whenever the store's state changes.
   */
  subscribe = (fn: Listener<State>) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /**
   * Returns the current state of the store.
   */
  getSnapshot = () => {
    return this.state;
  };

  /**
   * Updates the entire store's state and notifies all registered listeners.
   */
  setState(newState: State) {
    if (this.state === newState) {
      return;
    }

    this.updateTick += 1;
    this.state = newState;
    if (this.updateTick > 1) {
      return;
    }

    try {
      this.listeners.forEach((listener) => {
        listener(this.state);
      });
    } finally {
      this.updateTick = 0;
    }
  }

  /**
   * Updates a partial state and notifies all registered listeners.
   */
  update<const Key extends keyof State>(changes: Pick<State, Key>) {
    if (changes === null || typeof changes !== 'object') {
      return;
    }

    this.setState({...this.state, ...changes});
  }

  /**
   * Updates a single key in the store's state.
   */
  set<Key extends keyof State>(key: Key, value: State[Key]) {
    if (this.state[key] === value) {
      return;
    }

    this.setState({...this.state, [key]: value});
  }

  /**
   * Notifies all registered listeners.
   */
  notifyAll() {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }
}

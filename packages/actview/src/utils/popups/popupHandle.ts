import { AnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { PopupTriggerMap } from './popupTriggerMap';

/**
 * Minimal store contract exposed by popup handles to detached triggers.
 */
export interface PopupHandleStoreProvider<HandleStore> {
  /**
   * Store currently exposed by the handle.
   */
  readonly store: HandleStore;

  /**
   * Stable store used to reproduce the server-rendered trigger snapshot during hydration.
   * @internal
   */
  readonly serverStore: HandleStore;

  /**
   * Subscribes to changes of the exposed store pointer.
   */
  subscribeStore(listener: () => void): () => void;
}

/**
 * Store shape holding a trigger registry, required by `BasePopupHandle.openByTrigger` to resolve a
 * trigger element by id on both the attached root's store and the fallback store.
 */
export interface PopupHandleStoreWithTriggers {
  readonly context: {readonly triggerElements: PopupTriggerMap};
}

/**
 * Store shape required by `BasePopupHandle.openByTrigger`/`closePopup` to drive open/close state.
 */
export interface PopupHandleStoreWithOpen extends PopupHandleStoreWithTriggers {
  setOpen(
    open: boolean,
    eventDetails: BaseUIChangeEventDetails<typeof REASONS.imperativeAction>,
  ): void;
}

/**
 * Shared implementation for popup handles that coordinate detached triggers with a mounted root.
 */
export class BasePopupHandle<
  HandleStore extends PopupHandleStoreWithTriggers,
  Store extends HandleStore & PopupHandleStoreWithOpen,
> {
  /**
   * Stores of every root currently using this handle, in attach order.
   */
  private readonly attachedStores: Store[] = [];

  /**
   * Store of the root that currently controls the handle.
   */
  private attachedStoreValue: Store | null = null;

  /**
   * Listeners notified when `attachedStore` changes, so detached triggers can follow the store pointer.
   */
  private readonly storeListeners = new Set<() => void>();

  /**
   * Creates a handle backed by the store used while no root is attached.
   */
  constructor(
    protected readonly fallbackStore: HandleStore,
    private readonly componentName: string,
    private readonly throwOnMissingTrigger: boolean = true,
  ) {}

  protected get attachedStore() {
    return this.attachedStoreValue;
  }

  /**
   * Store that detached triggers read from: the attached root's store, or an inert fallback store
   * used while no root is attached.
   * @internal
   */
  get store(): HandleStore {
    return this.attachedStoreValue ?? this.fallbackStore;
  }

  /**
   * Stable fallback store used for server rendering and hydration.
   * @internal
   */
  get serverStore(): HandleStore {
    return this.fallbackStore;
  }

  /**
   * Subscribes to changes of the attached store pointer.
   * @internal
   */
  subscribeStore(listener: () => void) {
    this.storeListeners.add(listener);

    return () => {
      this.storeListeners.delete(listener);
    };
  }

  /**
   * Points the handle at a root's store and notifies subscribers.
   * @internal
   */
  attachStore(newStore: Store) {
    this.attachedStores.push(newStore);
    this.setActiveStore(newStore);

    if (process.env.NODE_ENV !== 'production') {
      if (this.attachedStores.length > 1) {
        // More than one root is attached at once. This is usually a transient overlap during an
        // animated route transition. Defer the check by a frame and only warn if the overlap is
        // still present once the transition has settled.
        const dev = this as this & {overlapWarningFrame?: AnimationFrame | undefined};
        (dev.overlapWarningFrame ??= AnimationFrame.create()).request(() => {
          if (this.attachedStores.length > 1) {
            console.warn(
              'Base UI: A handle is attached to more than one mounted root at the same time. ' +
                'The most recently mounted root takes over and the previous one stops being controlled by the handle. ' +
                'A handle should be used by a single root that stays mounted for the lifetime of the handle.',
            );
          }
        });
      }
    }

    return () => {
      const index = this.attachedStores.lastIndexOf(newStore);
      if (index !== -1) {
        this.attachedStores.splice(index, 1);
      }
      // Restore control to the most recently attached root that is still mounted (or detach fully if
      // none remain).
      this.setActiveStore(this.attachedStores[this.attachedStores.length - 1] ?? null);
    };
  }

  /**
   * Sets the store that currently controls the handle and notifies subscribers when it changes.
   */
  private setActiveStore(store: Store | null) {
    if (this.attachedStoreValue !== store) {
      this.attachedStoreValue = store;
      this.storeListeners.forEach((listener) => {
        listener();
      });
    }
  }

  /**
   * Opens the attached root's store and associates it with the trigger with the given id.
   */
  protected openByTrigger(triggerId: string | null | undefined) {
    const attachedStore = this.attachedStore;

    if (attachedStore === null) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Base UI: ${this.componentName}Handle.open() was called while no root using this handle is mounted. ` +
            'The call was ignored; mount a root with this handle before opening it imperatively.',
        );
      }
      return;
    }

    let triggerElement: Element | undefined;
    if (triggerId) {
      for (let i = this.attachedStores.length - 1; i >= 0 && !triggerElement; i -= 1) {
        triggerElement = this.attachedStores[i].context.triggerElements.getById(triggerId);
      }
      triggerElement ??= this.fallbackStore.context.triggerElements.getById(triggerId);
    }

    if (triggerId && !triggerElement) {
      if (this.throwOnMissingTrigger) {
        throw new Error(
          `Base UI: ${this.componentName}Handle.open() was called with the trigger id "${triggerId}", ` +
            'but no matching trigger is registered with this handle. ' +
            'An anchored popup cannot open without a trigger to anchor to. ' +
            `Pass the id of a mounted ${this.componentName}.Trigger that has this handle set on its "handle" prop.`,
        );
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Base UI: ${this.componentName}Handle.open: No trigger found with id "${triggerId}". ` +
            'The popup will open, but the trigger will not be associated with it.',
        );
      }
    }

    attachedStore.setOpen(
      true,
      createChangeEventDetails(REASONS.imperativeAction, undefined, triggerElement),
    );
  }

  /**
   * Closes the popup by setting the attached root's store to closed.
   */
  protected closePopup() {
    const attachedStore = this.attachedStore;

    if (attachedStore === null) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Base UI: ${this.componentName}Handle.close() was called while no root using this handle is mounted. ` +
            'The call was ignored.',
        );
      }
      return;
    }

    attachedStore.setOpen(false, createChangeEventDetails(REASONS.imperativeAction));
  }
}

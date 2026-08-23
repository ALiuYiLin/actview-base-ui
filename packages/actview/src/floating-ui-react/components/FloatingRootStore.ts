import { ReactStore } from '@/internals/store/ReactStore';
import { computed } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import type { FloatingEvents, ReferenceType } from '../types';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { createEventEmitter } from '../utils/createEventEmitter';
import type { FloatingUIOpenChangeDetails } from '@/internals/types';
import type { PopupTriggerMap } from '@/utils/popups';
import { isClickLikeEvent } from '../utils/event';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

export interface FloatingRootState {
  open: boolean;
  transitionStatus: TransitionStatus | undefined;
  domReferenceElement: Element | null;
  referenceElement: ReferenceType | null;
  floatingElement: HTMLElement | null;
  positionReference: ReferenceType | null;
  /**
   * The ID of the floating element.
   */
  floatingId: string | undefined;
}

export interface FloatingRootStoreContext {
  onOpenChange:
    | ((open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void)
    | undefined;
  readonly dataRef: {current: ContextDataLike};
  readonly events: FloatingEvents;
  nested: boolean;
  readonly triggerElements: PopupTriggerMap;
}

interface ContextDataLike {
  openEvent?: Event | undefined;
  [key: string]: any;
}

const selectors = {
  open: (state: FloatingRootState) => state.open,
  transitionStatus: (state: FloatingRootState) => state.transitionStatus,
  domReferenceElement: (state: FloatingRootState) => state.domReferenceElement,
  referenceElement: (state: FloatingRootState) => state.positionReference ?? state.referenceElement,
  floatingElement: (state: FloatingRootState) => state.floatingElement,
  floatingId: (state: FloatingRootState) => state.floatingId,
};

interface FloatingRootStoreOptions {
  open: boolean;
  transitionStatus: TransitionStatus | undefined;
  referenceElement: ReferenceType | null;
  floatingElement: HTMLElement | null;
  triggerElements: PopupTriggerMap;
  floatingId: string | undefined;
  /**
   * When true, `setOpen` only forwards to `onOpenChange`.
   * The popup store owns `dispatchOpenChange(...)` in this mode.
   */
  syncOnly: boolean;
  nested: boolean;
  onOpenChange:
    | ((open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void)
    | undefined;
}

export class FloatingRootStore extends ReactStore<
  Readonly<FloatingRootState>,
  FloatingRootStoreContext,
  typeof selectors
> {
  private readonly syncOnly: boolean;

  constructor(options: FloatingRootStoreOptions) {
    const {syncOnly, nested, onOpenChange, triggerElements, ...initialState} = options;

    const contextData = {};
    super(
      {
        ...initialState,
        positionReference: initialState.referenceElement,
        domReferenceElement: initialState.referenceElement as Element | null,
      },
      {
        onOpenChange,
        // current/value 指向同一对象：MenuStore 侧用 .current，
        // @floating-ui/actview 的 useFloating 用 .value，两者互相可见。
        dataRef: {current: contextData, value: contextData} as any,
        events: createEventEmitter(),
        nested,
        triggerElements,
      },
      selectors,
    );

    this.syncOnly = syncOnly;

    // actview useFloating（@floating-ui/actview）读取 rootContext.elements：
    // {reference, floating, domReference} 均为 Ref（.value 读取）。
    this.elements = {
      reference: computed(() => this.select('referenceElement')) as Ref<ReferenceType | null>,
      floating: computed(() => this.select('floatingElement')) as Ref<HTMLElement | null>,
      domReference: computed(() => this.select('domReferenceElement')) as Ref<Element | null>,
    };
  }
  readonly elements: {
    reference: Ref<ReferenceType | null>;
    floating: Ref<HTMLElement | null>;
    domReference: Ref<Element | null>;
  };

  /**
   * Direct-property aliases matching @floating-ui/actview's FloatingRootContext surface:
   * actview useFloating reads `rootContext.dataRef`, `rootContext.events`, etc. directly.
   */
  get dataRef() {
    return this.context.dataRef;
  }

  get events() {
    return this.context.events;
  }

  get floatingId() {
    return this.state.floatingId;
  }

  /**
   * Syncs the event used by hover logic to distinguish hover-open from click-like interaction.
   */
  syncOpenEvent = (newOpen: boolean, event: Event | undefined) => {
    if (
      !newOpen ||
      !this.state.open ||
      // Prevent a pending hover-open from overwriting a click-open event, while allowing
      // click events to upgrade a hover-open.
      (event != null && isClickLikeEvent(event))
    ) {
      this.context.dataRef.current.openEvent = newOpen ? event : undefined;
    }
  };

  /**
   * Runs the root-owned side effects for an open state change.
   */
  dispatchOpenChange = (newOpen: boolean, eventDetails: BaseUIChangeEventDetails<string>) => {
    this.syncOpenEvent(newOpen, eventDetails.event);

    const details: FloatingUIOpenChangeDetails = {
      open: newOpen,
      reason: eventDetails.reason,
      nativeEvent: eventDetails.event,
      nested: this.context.nested,
      triggerElement: eventDetails.trigger,
    };

    this.context.events.emit('openchange', details);
  };

  /**
   * Emits the `openchange` event through the internal event emitter and calls the `onOpenChange` handler with the provided arguments.
   */
  setOpen = (newOpen: boolean, eventDetails: BaseUIChangeEventDetails<string>) => {
    if (this.syncOnly) {
      this.context.onOpenChange?.(newOpen, eventDetails);
      return;
    }

    this.dispatchOpenChange(newOpen, eventDetails);

    this.context.onOpenChange?.(newOpen, eventDetails);
  };
}

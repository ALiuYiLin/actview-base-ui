import { ReactStore, NullStore } from '@/internals/store';
import { NOOP } from '@/utils/empty';
import type { TooltipRoot } from '../root/TooltipRoot';
import {
  createInitialPopupStoreState,
  popupStoreSelectors,
  type PopupStoreContext,
  type PopupStoreState,
  type PopupTriggerStoreKeys,
  PopupTriggerMap,
} from '@/utils/popups';
import type { AdaptiveOriginMiddleware } from '@/utils/adaptiveOriginConstants';

export type State<Payload> = PopupStoreState<Payload> & {
  disabled: boolean;
  instantType: 'delay' | 'dismiss' | 'focus' | undefined;
  isInstantPhase: boolean;
  trackCursorAxis: 'none' | 'x' | 'y' | 'both';
  disableHoverablePopup: boolean;
  openChangeReason: TooltipRoot.ChangeEventReason | null;
  closeOnClick: boolean;
  closeDelay: number;
  adaptiveOrigin: AdaptiveOriginMiddleware | undefined;
};

export type Context = PopupStoreContext<TooltipRoot.ChangeEventDetails> & {
  readonly popupRef: {value: HTMLElement | null};
};

const selectors = {
  ...popupStoreSelectors,
  disabled: (state: State<unknown>) => state.disabled,
  instantType: (state: State<unknown>) => state.instantType,
  isInstantPhase: (state: State<unknown>) => state.isInstantPhase,
  trackCursorAxis: (state: State<unknown>) => state.trackCursorAxis,
  disableHoverablePopup: (state: State<unknown>) => state.disableHoverablePopup,
  lastOpenChangeReason: (state: State<unknown>) => state.openChangeReason,
  closeOnClick: (state: State<unknown>) => state.closeOnClick,
  closeDelay: (state: State<unknown>) => state.closeDelay,
  adaptiveOrigin: (state: State<unknown>): AdaptiveOriginMiddleware | undefined =>
    state.adaptiveOrigin,
};

type Selectors = typeof selectors;

/**
 * The store view that detached handle-backed triggers read from. Both the real `TooltipStore` and
 * the inert fallback store satisfy it.
 */
export type TooltipHandleStore<Payload> = Pick<
  TooltipStore<Payload>,
  PopupTriggerStoreKeys | 'setOpen'
>;

export class TooltipStore<Payload> extends ReactStore<Readonly<State<Payload>>, Context, Selectors> {
  constructor(
    initialState?: Partial<State<Payload>>,
    floatingId?: string | undefined,
    nested = false,
  ) {
    const triggerElements = new PopupTriggerMap();
    super(
      createInitialState<Payload>(triggerElements, floatingId, nested, initialState),
      createInitialContext(triggerElements),
      selectors,
    );
  }

  setOpen(open: boolean, eventDetails: Omit<TooltipRoot.ChangeEventDetails, 'preventUnmountOnClose'>) {
    this.state.floatingRootContext.context.events.emit('setOpen', {open, eventDetails});
  }
}

/**
 * Creates the inert fallback store used by detached handle-backed triggers while no
 * `Tooltip.Root` is attached.
 */
export function createNullTooltipStore<Payload>(): TooltipHandleStore<Payload> {
  const triggerElements = new PopupTriggerMap();
  const store = new NullStore<Readonly<State<Payload>>, Context, Selectors>(
    Object.freeze(createInitialState<Payload>(triggerElements)),
    Object.freeze(createInitialContext(triggerElements)),
    selectors,
  );
  return Object.assign(store, {setOpen: NOOP});
}

function createInitialState<Payload>(
  triggerElements: PopupTriggerMap,
  floatingId?: string | undefined,
  nested = false,
  initialState?: Partial<State<Payload>>,
): State<Payload> {
  const state: State<Payload> = {
    ...createInitialPopupStoreState<Payload>(triggerElements, floatingId, nested),
    disabled: false,
    instantType: undefined,
    isInstantPhase: false,
    trackCursorAxis: 'none',
    disableHoverablePopup: false,
    openChangeReason: null,
    closeOnClick: false,
    closeDelay: 0,
    adaptiveOrigin: undefined,
    ...initialState,
  };

  if (state.open && initialState?.mounted === undefined) {
    state.mounted = true;
  }

  return state;
}

function createInitialContext(triggerElements: PopupTriggerMap): Context {
  return {
    popupRef: {value: null},
    onOpenChange: undefined,
    onOpenChangeComplete: undefined,
    triggerElements,
  };
}

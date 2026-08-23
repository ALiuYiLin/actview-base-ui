import { ReactStore, NullStore } from '@/internals/store';
import { NOOP } from '@/utils/empty';
import type { InteractionType } from '@/utils/useEnhancedClickHandler';
import type { DialogRoot } from '../root/DialogRoot';
import {
  createInitialPopupStoreState,
  popupStoreSelectors,
  type PopupStoreContext,
  type PopupStoreState,
  type PopupTriggerStoreKeys,
  PopupTriggerMap,
} from '@/utils/popups';

export type State<Payload> = PopupStoreState<Payload> & {
  modal: boolean | 'trap-focus';
  disablePointerDismissal: boolean;
  openMethod: InteractionType | null;
  nested: boolean;
  nestedOpenDialogCount: number;
  nestedOpenDrawerCount: number;
  titleElementId: string | undefined;
  descriptionElementId: string | undefined;
  viewportElement: HTMLElement | null;
  role: 'dialog' | 'alertdialog';
};

export type Context = PopupStoreContext<DialogRoot.ChangeEventDetails> & {
  readonly popupRef: {value: HTMLElement | null};
  readonly backdropRef: {value: HTMLDivElement | null};
  readonly internalBackdropRef: {value: HTMLDivElement | null};
  readonly outsidePressEnabledRef: {value: boolean};
  readonly triggerFocusTargetRef: {value: HTMLElement | null};
  readonly beforeContentFocusGuardRef: {value: HTMLElement | null};
};

const selectors = {
  ...popupStoreSelectors,
  modal: (state: State<unknown>) => state.modal,
  disablePointerDismissal: (state: State<unknown>) => state.disablePointerDismissal,
  openMethod: (state: State<unknown>) => state.openMethod,
  nested: (state: State<unknown>) => state.nested,
  nestedOpenDialogCount: (state: State<unknown>) => state.nestedOpenDialogCount,
  nestedOpenDrawerCount: (state: State<unknown>) => state.nestedOpenDrawerCount,
  titleElementId: (state: State<unknown>) => state.titleElementId,
  descriptionElementId: (state: State<unknown>) => state.descriptionElementId,
  viewportElement: (state: State<unknown>) => state.viewportElement,
  role: (state: State<unknown>) => state.role,
};

type Selectors = typeof selectors;

/**
 * The store view that detached handle-backed triggers read from.
 */
export type DialogHandleStore<Payload> = Pick<
  DialogStore<Payload>,
  PopupTriggerStoreKeys | 'setOpen'
>;

export class DialogStore<Payload> extends ReactStore<Readonly<State<Payload>>, Context, Selectors> {
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

  setOpen(open: boolean, eventDetails: Omit<DialogRoot.ChangeEventDetails, 'preventUnmountOnClose'>) {
    this.state.floatingRootContext.context.events.emit('setOpen', {open, eventDetails});
  }
}

/**
 * Creates the inert fallback store used by detached handle-backed triggers while no
 * `Dialog.Root` is attached.
 */
export function createNullDialogStore<Payload>(): DialogHandleStore<Payload> {
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
    modal: true,
    disablePointerDismissal: false,
    openMethod: null,
    nested,
    nestedOpenDialogCount: 0,
    nestedOpenDrawerCount: 0,
    titleElementId: undefined,
    descriptionElementId: undefined,
    viewportElement: null,
    role: 'dialog',
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
    backdropRef: {value: null},
    internalBackdropRef: {value: null},
    outsidePressEnabledRef: {value: true},
    triggerFocusTargetRef: {value: null},
    beforeContentFocusGuardRef: {value: null},
    onOpenChange: undefined,
    onOpenChangeComplete: undefined,
    triggerElements,
  };
}

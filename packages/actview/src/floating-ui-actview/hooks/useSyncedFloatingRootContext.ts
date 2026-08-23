import { watch } from 'actview';
import type { ActviewStore } from '@base-ui/actview-utils/store';
import { isElement } from '@floating-ui/utils/dom';
import type { BaseUIChangeEventDetails } from '@/types';
import type {
  PopupStoreContext,
  PopupStoreSelectors,
  PopupStoreState,
} from '@/utils/popups';
import { type FloatingRootState, FloatingRootStore } from '@/floating-ui-actview/components/FloatingRootStore';

/**
 * Narrowed to the store members this hook uses so consumers do not need to provide
 * unrelated store capabilities.
 */
export type SyncedFloatingRootContextStore<State extends PopupStoreState<unknown>> = Pick<
  ActviewStore<Readonly<State>, PopupStoreContext<never>, PopupStoreSelectors>,
  'context' | 'state' | 'useState' | 'useSyncedValue'
>;

export interface UseSyncedFloatingRootContextOptions<
  State extends PopupStoreState<unknown>,
  OpenChangeEventDetails extends BaseUIChangeEventDetails<string>,
> {
  popupStore: SyncedFloatingRootContextStore<State>;
  /**
   * Whether the Popup element is passed to Floating UI as the floating element instead of the default Positioner.
   */
  treatPopupAsFloatingElement?: boolean | undefined;
  floatingRootContext?: FloatingRootStore | undefined;
  floatingId: string | undefined;
  nested: boolean;
  onOpenChange(open: boolean, eventDetails: OpenChangeEventDetails): void;
}

/**
 * Keeps a FloatingRootStore in sync with the provided PopupStore.
 * Uses the provided FloatingRootStore when one exists, otherwise creates one once and updates it on every render.
 */
export function useSyncedFloatingRootContext<
  State extends PopupStoreState<unknown>,
  OpenChangeEventDetails extends BaseUIChangeEventDetails<string>,
>(options: UseSyncedFloatingRootContextOptions<State, OpenChangeEventDetails>): FloatingRootStore {
  const {
    popupStore,
    treatPopupAsFloatingElement = false,
    floatingRootContext: floatingRootContextProp,
    floatingId,
    nested,
    onOpenChange,
  } = options;

  const open = popupStore.useState('open');
  const referenceElement = popupStore.useState('activeTriggerElement');
  const floatingElement = popupStore.useState(
    treatPopupAsFloatingElement ? 'popupElement' : 'positionerElement',
  );
  const triggerElements = popupStore.context.triggerElements;

  const handleOpenChange = onOpenChange as (
    open: boolean,
    eventDetails: BaseUIChangeEventDetails<string>,
  ) => void;

  let internalStore: FloatingRootStore | null = null;
  if (floatingRootContextProp === undefined && internalStore === null) {
    internalStore = new FloatingRootStore({
      open: open.value,
      transitionStatus: undefined,
      referenceElement: referenceElement.value,
      floatingElement: floatingElement.value,
      triggerElements,
      onOpenChange: handleOpenChange,
      floatingId,
      syncOnly: true,
      nested,
    });
  }

  const store = floatingRootContextProp ?? internalStore!;

  popupStore.useSyncedValue('floatingId', floatingId as State['floatingId']);

  watch(
    [open, referenceElement, floatingElement],
    (newVals) => {
      // Guard against a stale post-unmount callback receiving `undefined` (AD-33).
      const [openValue, referenceValue, floatingValue] = Array.isArray(newVals) ? newVals : [];
      const valuesToSync = {
        open: openValue,
        floatingId,
        referenceElement: referenceValue,
        floatingElement: floatingValue,
      } as Pick<
        FloatingRootState,
        | 'open'
        | 'floatingId'
        | 'referenceElement'
        | 'floatingElement'
        | 'domReferenceElement'
        | 'positionReference'
      >;

      if (isElement(referenceValue)) {
        valuesToSync.domReferenceElement = referenceValue;
      }

      if (store.state.positionReference === store.state.referenceElement) {
        valuesToSync.positionReference = referenceValue;
      }

      store.update(valuesToSync);
    },
    { immediate: true },
  );

  // Keep non-reactive context values fresh for interactions that call `store.setOpen`.
  store.context.onOpenChange = handleOpenChange;
  store.context.nested = nested;

  return store;
}

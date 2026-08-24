import {watch, ref} from 'actview';
import type { ReactStore } from '@/internals/store/ReactStore';
import { isElement } from '@floating-ui/utils/dom';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { PopupStoreContext, PopupStoreSelectors, PopupStoreState } from '@/utils/popups';
import { FloatingRootStore, type FloatingRootState } from '../components/FloatingRootStore';

/**
 * Narrowed to the store members this hook uses so consumers do not need to provide
 * unrelated store capabilities.
 */
export type SyncedFloatingRootContextStore<State extends PopupStoreState<unknown>> = Pick<
  ReactStore<Readonly<State>, PopupStoreContext<never>, PopupStoreSelectors>,
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
 * (actview 版：useState 返回 ComputedRef；useIsoLayoutEffect → watch flush post。)
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

  const internalStoreRef = ref(null as FloatingRootStore | null);
  if (floatingRootContextProp === undefined && internalStoreRef.value === null) {
    internalStoreRef.value = new FloatingRootStore({
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

  const store = floatingRootContextProp ?? internalStoreRef.value!;

  popupStore.useSyncedValue('floatingId', floatingId as State['floatingId']);

  watch(
    () => [open.value, floatingId, referenceElement.value, floatingElement.value] as const,
    ([openValue, floatingIdValue, referenceElementValue, floatingElementValue]) => {
      const valuesToSync = {
        open: openValue,
        floatingId: floatingIdValue,
        referenceElement: referenceElementValue,
        floatingElement: floatingElementValue,
      } as Pick<
        FloatingRootState,
        | 'open'
        | 'floatingId'
        | 'referenceElement'
        | 'floatingElement'
        | 'domReferenceElement'
        | 'positionReference'
      >;

      if (isElement(referenceElementValue)) {
        valuesToSync.domReferenceElement = referenceElementValue;
      }

      if (store.state.positionReference === store.state.referenceElement) {
        valuesToSync.positionReference = referenceElementValue;
      }

      store.update(valuesToSync);
    },
    {flush: 'post', immediate: true},
  );

  // Keep non-reactive context values fresh for interactions that call `store.setOpen`.
  store.context.onOpenChange = handleOpenChange;
  store.context.nested = nested;

  return store;
}

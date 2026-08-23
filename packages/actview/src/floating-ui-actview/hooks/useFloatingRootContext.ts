import { unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { isElement } from '@floating-ui/utils/dom';
import { useId } from '@base-ui/actview-utils/useId';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { PopupTriggerMap } from '@/utils/popups';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { useFloatingParentNodeId } from '@/floating-ui-actview/components/FloatingTree';
import {
  FloatingRootStore,
  type FloatingRootState as State,
} from '@/floating-ui-actview/components/FloatingRootStore';
import type { ReferenceType } from '@/floating-ui-actview/types';

export interface UseFloatingRootContextOptions {
  open?: boolean | Ref<boolean> | undefined;
  onOpenChange?(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  elements?:
    | {
        reference?: ReferenceType | null | undefined;
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
}

export function useFloatingRootContext(options: UseFloatingRootContextOptions): FloatingRootStore {
  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  if (process.env.NODE_ENV !== 'production') {
    const optionDomReference = options.elements?.reference;
    if (optionDomReference && !isElement(optionDomReference)) {
      console.error(
        'Cannot pass a virtual element to the `elements.reference` option,',
        'as it must be a real DOM element. Use `context.setPositionReference()`',
        'instead.',
      );
    }
  }

  const store = useRefWithInit(
    () =>
      new FloatingRootStore({
        open: unref(options.open) ?? false,
        transitionStatus: undefined,
        onOpenChange: options.onOpenChange,
        referenceElement: options.elements?.reference ?? null,
        floatingElement: options.elements?.floating ?? null,
        triggerElements: new PopupTriggerMap(),
        floatingId,
        syncOnly: false,
        nested,
      }),
  ).current;

  watch(
    () => [
      unref(options.open) ?? false,
      floatingId,
      options.elements?.reference,
      options.elements?.floating,
    ],
    ([open, _floatingId, reference, floating]) => {
      const valuesToSync = { open, floatingId } as Pick<
        State,
        'open' | 'floatingId' | 'referenceElement' | 'domReferenceElement' | 'floatingElement'
      >;

      if (options.elements?.reference !== undefined) {
        valuesToSync.referenceElement = options.elements.reference;
        valuesToSync.domReferenceElement = isElement(options.elements.reference)
          ? options.elements.reference
          : null;
      }

      if (options.elements?.floating !== undefined) {
        valuesToSync.floatingElement = options.elements.floating;
      }

      store.update(valuesToSync);
    },
    { immediate: true },
  );

  watch(
    () => [options.onOpenChange, nested],
    ([onOpenChange, nestedValue]) => {
      store.context.onOpenChange = onOpenChange;
      store.context.nested = nestedValue;
    },
    { immediate: true },
  );

  return store;
}

import { PopupTriggerMap } from '@/utils/popups';
import { FloatingRootStore } from '@/floating-ui-actview/components/FloatingRootStore';
import type { FloatingRootContext } from '@/floating-ui-actview/types';

export function getEmptyRootContext(): FloatingRootContext {
  return new FloatingRootStore({
    open: false,
    transitionStatus: undefined,
    floatingElement: null,
    referenceElement: null,
    triggerElements: new PopupTriggerMap(),
    floatingId: undefined,
    syncOnly: false,
    nested: false,
    onOpenChange: undefined,
  });
}

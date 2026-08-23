import { ref } from 'actview';
import {
  type FocusableElement,
  getNextTabbable,
  getTabbableAfterElement,
  getTabbableBeforeElement,
  isOutsideEvent,
} from '@/floating-ui-react/utils';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';

/**
 * Minimal store interface required by the focus guard hook.
 */
interface TriggerFocusGuardStore {
  setOpen(open: boolean, eventDetails: BaseUIChangeEventDetails<typeof REASONS.focusOut>): void;
  select(key: 'positionerElement'): HTMLElement | null;
  context: {
    readonly beforeContentFocusGuardRef: {current: HTMLElement | null};
    readonly triggerFocusTargetRef: {current: HTMLElement | null};
  };
}

/**
 * Provides focus guard handlers for popup triggers (Popover, Menu).
 *
 * When the popup is open, invisible focus guard elements are placed before and after
 * the trigger. These handlers close the popup and move focus to the appropriate
 * tabbable element when the guards receive focus (i.e. when the user tabs out).
 */
export function useTriggerFocusGuards(
  store: TriggerFocusGuardStore,
  triggerElementRef: {current: HTMLElement | null},
) {
  const preFocusGuardRef = ref<HTMLElement | null>(null);

  function handlePreFocusGuardFocus(event: any) {
    store.setOpen(
      false,
      createChangeEventDetails(
        REASONS.focusOut,
        event.nativeEvent,
        event.currentTarget as HTMLElement,
      ),
    );

    const previousTabbable: FocusableElement | null = getTabbableBeforeElement(
      preFocusGuardRef.value,
    );
    previousTabbable?.focus();
  }

  function handlePostFocusGuardFocus(event: any) {
    store.setOpen(
      false,
      createChangeEventDetails(
        REASONS.focusOut,
        event.nativeEvent,
        event.currentTarget as HTMLElement,
      ),
    );

    const nextTabbable: FocusableElement | null = getTabbableAfterElement(
      store.select('positionerElement'),
    );
    nextTabbable?.focus();
  }

  function handleTriggerFocus(event: any) {
    const currentTarget = event.currentTarget as HTMLElement;
    const positioner = store.select('positionerElement');
    if (!positioner) {
      return;
    }

    const isFocusInsidePopup = positioner.contains(event.relatedTarget as Node | null);
    const isFocusFromOpen = event.relatedTarget == null;
    const isFocusFromTriggerFocusTarget = event.relatedTarget === store.context.triggerFocusTargetRef.current;
    const isTabFromPopupToTrigger = isOutsideEvent(event, positioner) && !isFocusFromOpen;

    if (
      positioner &&
      !isFocusInsidePopup &&
      !isFocusFromOpen &&
      !isFocusFromTriggerFocusTarget &&
      (isTabFromPopupToTrigger || currentTarget === triggerElementRef.current)
    ) {
      // Focus left the popup via Tab; the popup should close.
      store.setOpen(
        false,
        createChangeEventDetails(
          REASONS.focusOut,
          event.nativeEvent,
          event.currentTarget as HTMLElement,
        ),
      );
    }
  }

  return {
    handlePreFocusGuardFocus,
    handlePostFocusGuardFocus,
    handleTriggerFocus,
  };
}

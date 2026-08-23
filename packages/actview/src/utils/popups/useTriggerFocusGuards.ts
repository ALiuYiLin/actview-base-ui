import {
  type FocusableElement,
  getNextTabbable,
  getTabbableAfterElement,
  getTabbableBeforeElement,
  isOutsideEvent,
} from '@/floating-ui-actview/utils/tabbable';
import { contains } from '@/floating-ui-actview/utils/element';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';

/**
 * Minimal store interface required by the focus guard hook.
 * Both PopoverStore and MenuStore satisfy this interface.
 */
interface TriggerFocusGuardStore {
  setOpen(open: boolean, eventDetails: BaseUIChangeEventDetails<typeof REASONS.focusOut>): void;
  select(key: 'positionerElement'): HTMLElement | null;
  context: {
    readonly beforeContentFocusGuardRef: { current: HTMLElement | null };
    readonly triggerFocusTargetRef: { current: HTMLElement | null };
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
  triggerElementRef: { current: HTMLElement | null },
) {
  const preFocusGuardRef = { current: null as HTMLElement | null };

  function handlePreFocusGuardFocus(event: FocusEvent) {
    store.setOpen(
      false,
      createChangeEventDetails(
        REASONS.focusOut,
        event,
        event.currentTarget as HTMLElement,
      ),
    );

    const previousTabbable: FocusableElement | null = getTabbableBeforeElement(
      preFocusGuardRef.current,
    );
    previousTabbable?.focus();
  }

  function handleFocusTargetFocus(event: FocusEvent) {
    const positionerElement = store.select('positionerElement');
    if (positionerElement && isOutsideEvent(event, positionerElement)) {
      store.context.beforeContentFocusGuardRef.current?.focus();
    } else {
      store.setOpen(
        false,
        createChangeEventDetails(
          REASONS.focusOut,
          event,
          event.currentTarget as HTMLElement,
        ),
      );

      let nextTabbable = getTabbableAfterElement(
        store.context.triggerFocusTargetRef.current || triggerElementRef.current,
      );

      while (nextTabbable !== null && contains(positionerElement, nextTabbable)) {
        const prevTabbable = nextTabbable;
        nextTabbable = getNextTabbable(nextTabbable);
        if (nextTabbable === prevTabbable) {
          break;
        }
      }

      nextTabbable?.focus();
    }
  }

  return { preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus };
}

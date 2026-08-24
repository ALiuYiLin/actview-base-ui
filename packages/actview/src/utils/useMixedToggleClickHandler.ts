import { ownerDocument } from '@/internals/owner';
import { EMPTY_OBJECT } from '@/utils/empty';
import type { Ref } from 'actview';
import {ref} from 'actview';

/**
 * Returns `click` and `mousedown` handlers that fix the behavior of triggers of popups that are toggled by different events.
 * For example, a button that opens a popup on mousedown and closes it on click.
 * This hook prevents the popup from closing immediately after the mouse button is released.
 * (actview 版：open 可为 Ref/ComputedRef 读 .value。)
 */
export function useMixedToggleClickHandler(params: UseMixedToggleClickHandlerParameters) {
  const {enabled = true, mouseDownAction, open} = params;
  const ignoreClickRef = ref(false);

  const openValue = typeof open === 'boolean' ? open : open.value;

  if (!enabled) {
    return EMPTY_OBJECT;
  }

  return {
    onMouseDown: (event: any) => {
      if (
        (mouseDownAction === 'open' && !openValue) ||
        (mouseDownAction === 'close' && openValue)
      ) {
        ignoreClickRef.value = true;

        ownerDocument(event.currentTarget as Element).addEventListener(
          'click',
          () => {
            ignoreClickRef.value = false;
          },
          {once: true},
        );
      }
    },
    onClick: (event: any) => {
      if (ignoreClickRef.value) {
        ignoreClickRef.value = false;
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}

export interface UseMixedToggleClickHandlerParameters {
  /**
   * Whether the mixed toggle click handler is enabled.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Determines what action is performed on mousedown.
   */
  mouseDownAction: 'open' | 'close';
  /**
   * The current open state of the popup.
   */
  open: boolean | Ref<boolean>;
}

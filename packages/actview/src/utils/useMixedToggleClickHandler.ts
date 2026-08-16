import { unref } from 'actview';
import type { Ref } from '@actview/core';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type { BaseUIEvent } from '../internals/types';

type MaybeRef<T> = T | Ref<T>;

/**
 * Returns `click` and `mousedown` handlers that fix the behavior of triggers of popups that are toggled by different events.
 * For example, a button that opens a popup on mousedown and closes it on click.
 * This hook prevents the popup from closing immediately after the mouse button is released.
 */
export function useMixedToggleClickHandler(params: UseMixedToggleClickHandlerParameters) {
  let ignoreClick = false;

  return function getMixedToggleClickProps() {
    const enabled = unref(params.enabled) ?? true;
    if (!enabled) {
      return EMPTY_OBJECT;
    }

    return {
      onMouseDown: (event: MouseEvent) => {
        const mouseDownAction = unref(params.mouseDownAction);
        const open = unref(params.open);
        if ((mouseDownAction === 'open' && !open) || (mouseDownAction === 'close' && open)) {
          ignoreClick = true;

          ownerDocument(event.currentTarget as Element).addEventListener(
            'click',
            () => {
              ignoreClick = false;
            },
            { once: true },
          );
        }
      },
      onClick: (event: BaseUIEvent<MouseEvent>) => {
        if (ignoreClick) {
          ignoreClick = false;
          event.preventBaseUIHandler();
        }
      },
    };
  };
}

export interface UseMixedToggleClickHandlerParameters {
  /**
   * Whether the mixed toggle click handler is enabled.
   * @default true
   */
  enabled?: MaybeRef<boolean | undefined> | undefined;
  /**
   * Determines what action is performed on mousedown.
   */
  mouseDownAction: MaybeRef<'open' | 'close'>;
  /**
   * The current open state of the popup.
   */
  open: MaybeRef<boolean>;
}

export interface UseMixedToggleClickHandlerState {}

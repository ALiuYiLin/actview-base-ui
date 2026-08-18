import { platform } from '@base-ui/actview-utils/platform';
import type { HTMLProps } from '../../internals/types';
import type { MenuStore } from '../store/MenuStore';
import { REASONS } from '../../internals/reasons';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import type { UseMenuItemMetadata } from './useMenuItem';

function resolveValue<T>(value: T | (() => T)): T {
  return typeof value === 'function' ? (value as () => T)() : value;
}

export interface UseMenuItemCommonPropsParameters {
  /**
   * Whether to close the menu when the item is clicked.
   */
  closeOnClick: boolean;
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: boolean | (() => boolean);
  /**
   * The id of the menu item.
   */
  id: string | undefined;
  /**
   * The node id of the menu positioner.
   */
  nodeId: string | undefined | (() => string | undefined);
  /**
   * The menu store.
   */
  store: MenuStore<any>;
  /**
   * Whether a typeahead session is in progress.
   */
  typingRef?: { current: boolean } | undefined;
  /**
   * Ref to the item element.
   */
  itemRef: { current: HTMLElement | null };
  /**
   * Metadata for checking item type before triggering click.
   */
  itemMetadata: UseMenuItemMetadata;
}

/**
 * Returns a getter for the common props shared by all menu item types.
 * The getter extracts the shared logic for id, role, tabIndex, onKeyDown,
 * onMouseMove, onClick, and onMouseUp handlers and re-evaluates it on every
 * render so store-reactive values (open/highlighted) stay current.
 */
export function useMenuItemCommonProps(
  params: UseMenuItemCommonPropsParameters,
): () => HTMLProps {
  const { closeOnClick, highlighted, id, nodeId, store, typingRef, itemRef, itemMetadata } = params;

  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const open = store.useState('open');
  const contextMenuContext = useContextMenuRootContext(true);

  return () => {
    const isContextMenu = contextMenuContext.value !== undefined;
    const contextMenu = contextMenuContext.value;

    return {
      id,
      role: 'menuitem' as const,
      tabIndex: open.value && resolveValue(highlighted) ? 0 : -1,
      onKeyDown(event: KeyboardEvent) {
        if (event.key === ' ' && typingRef?.current) {
          event.preventDefault();
        }
      },
      onMouseMove(event: MouseEvent) {
        const nodeIdValue = resolveValue(nodeId);
        if (!nodeIdValue) {
          return;
        }

        // Inform the floating tree that a menu item within this menu was hovered/moved over
        // so unrelated descendant submenus can be closed.
        floatingTreeRoot.value.events.emit('itemhover', {
          nodeId: nodeIdValue,
          target: event.currentTarget,
        });
      },
      onClick(event: MouseEvent) {
        if (closeOnClick) {
          floatingTreeRoot.value.events.emit('close', { domEvent: event, reason: REASONS.itemPress });
        }
      },
      onMouseUp(event: MouseEvent) {
        if (contextMenu) {
          const initialCursorPoint = contextMenu.initialCursorPointRef.current;
          contextMenu.initialCursorPointRef.current = null;
          if (
            isContextMenu &&
            initialCursorPoint &&
            Math.abs(event.clientX - initialCursorPoint.x) <= 1 &&
            Math.abs(event.clientY - initialCursorPoint.y) <= 1
          ) {
            return;
          }

          // On non-macOS platforms, this mouseup belongs to the right-click gesture
          // that opened the context menu, so it must not activate an item.
          if (isContextMenu && !platform.os.mac && event.button === 2) {
            return;
          }
        }

        if (
          itemRef.current &&
          store.context.allowMouseUpTriggerRef.current &&
          (!isContextMenu || event.button === 2)
        ) {
          // This fires whenever the user clicks on the trigger, moves the cursor, and releases it over the item.
          // We trigger the click and override the `closeOnClick` preference to always close the menu.
          if (itemMetadata.type === 'regular-item') {
            // `detail: 1` marks this as a mouse-gesture click so MenuRoot doesn't
            // treat it as a keyboard activation (`detail === 0` → `data-instant`).
            dispatchClickWithModifiers(itemRef.current, event, { detail: 1 });
          }
        }
      },
    };
  };
}

export interface UseMenuItemCommonPropsState {}

import { MenuStore, createNullMenuStore, type MenuHandleStore } from './MenuStore';
import { BasePopupHandle } from '@/utils/popups/popupHandle';

/**
 * Controls a Menu imperatively and associates detached `Menu.Trigger` components with a `Menu.Root`.
 */
export class MenuHandle<Payload> extends BasePopupHandle<
  MenuHandleStore<Payload>,
  MenuStore<Payload>
> {
  constructor() {
    super(createNullMenuStore<Payload>(), 'Menu');
  }

  /**
   * Opens the menu and associates it with the trigger with the given id.
   */
  open(triggerId: string) {
    this.openByTrigger(triggerId);
  }

  /**
   * Closes the menu.
   */
  close() {
    this.closePopup();
  }

  /**
   * Whether the menu is currently open. Returns `false` while no root is attached to the handle.
   */
  get isOpen() {
    return this.attachedStore?.select('open') ?? false;
  }
}

/**
 * Creates a new handle to connect a Menu.Root with detached Menu.Trigger components.
 */
export function createMenuHandle<Payload>(): MenuHandle<Payload> {
  return new MenuHandle<Payload>();
}

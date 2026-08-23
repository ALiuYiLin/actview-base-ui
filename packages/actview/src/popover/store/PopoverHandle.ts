import { PopoverStore, createNullPopoverStore, type PopoverHandleStore } from './PopoverStore';
import { BasePopupHandle } from '@/utils/popups/popupHandle';

/**
 * Controls a Popover imperatively and associates detached `Popover.Trigger` components with a `Popover.Root`.
 */
export class PopoverHandle<Payload> extends BasePopupHandle<
  PopoverHandleStore<Payload>,
  PopoverStore<Payload>
> {
  constructor() {
    super(createNullPopoverStore<Payload>(), 'Popover');
  }

  /**
   * Opens the popover and associates it with the trigger with the given id.
   */
  open(triggerId: string) {
    this.openByTrigger(triggerId);
  }

  /**
   * Closes the popover.
   */
  close() {
    this.closePopup();
  }

  /**
   * Whether the popover is currently open. Returns `false` while no root is attached to the handle.
   */
  get isOpen() {
    return this.attachedStore?.select('open') ?? false;
  }
}

/**
 * Creates a new handle to connect a Popover.Root with detached Popover.Trigger components.
 */
export function createPopoverHandle<Payload>(): PopoverHandle<Payload> {
  return new PopoverHandle<Payload>();
}

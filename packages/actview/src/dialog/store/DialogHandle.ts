import { DialogStore, createNullDialogStore, type DialogHandleStore } from './DialogStore';
import { BasePopupHandle } from '@/utils/popups/popupHandle';

/**
 * Controls a Dialog imperatively and associates detached `Dialog.Trigger` components with a `Dialog.Root`.
 */
export class DialogHandle<Payload> extends BasePopupHandle<
  DialogHandleStore<Payload>,
  DialogStore<Payload>
> {
  constructor() {
    super(createNullDialogStore<Payload>(), 'Dialog');
  }

  /**
   * Opens the dialog and associates it with the trigger with the given id.
   */
  open(triggerId: string) {
    this.openByTrigger(triggerId);
  }

  /**
   * Closes the dialog.
   */
  close() {
    this.closePopup();
  }

  /**
   * Whether the dialog is currently open. Returns `false` while no root is attached to the handle.
   */
  get isOpen() {
    return this.attachedStore?.select('open') ?? false;
  }
}

/**
 * Creates a new handle to connect a Dialog.Root with detached Dialog.Trigger components.
 */
export function createDialogHandle<Payload>(): DialogHandle<Payload> {
  return new DialogHandle<Payload>();
}

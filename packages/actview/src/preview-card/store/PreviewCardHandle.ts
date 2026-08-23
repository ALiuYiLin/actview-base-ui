import { PreviewCardStore, createNullPreviewCardStore, type PreviewCardHandleStore } from './PreviewCardStore';
import { BasePopupHandle } from '@/utils/popups/popupHandle';

/**
 * Controls a PreviewCard imperatively and associates detached `PreviewCard.Trigger` components with a `PreviewCard.Root`.
 */
export class PreviewCardHandle<Payload> extends BasePopupHandle<
  PreviewCardHandleStore<Payload>,
  PreviewCardStore<Payload>
> {
  constructor() {
    super(createNullPreviewCardStore<Payload>(), 'PreviewCard');
  }

  /**
   * Opens the preview-card and associates it with the trigger with the given id.
   */
  open(triggerId: string) {
    this.openByTrigger(triggerId);
  }

  /**
   * Closes the preview-card.
   */
  close() {
    this.closePopup();
  }

  /**
   * Whether the preview-card is currently open. Returns `false` while no root is attached to the handle.
   */
  get isOpen() {
    return this.attachedStore?.select('open') ?? false;
  }
}

/**
 * Creates a new handle to connect a PreviewCard.Root with detached PreviewCard.Trigger components.
 */
export function createPreviewCardHandle<Payload>(): PreviewCardHandle<Payload> {
  return new PreviewCardHandle<Payload>();
}

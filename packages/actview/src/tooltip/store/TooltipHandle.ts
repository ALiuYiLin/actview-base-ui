import { TooltipStore, createNullTooltipStore, type TooltipHandleStore } from './TooltipStore';
import { BasePopupHandle } from '@/utils/popups/popupHandle';

/**
 * Controls a Tooltip imperatively and associates detached `Tooltip.Trigger` components with a `Tooltip.Root`.
 */
export class TooltipHandle<Payload> extends BasePopupHandle<
  TooltipHandleStore<Payload>,
  TooltipStore<Payload>
> {
  constructor() {
    super(createNullTooltipStore<Payload>(), 'Tooltip');
  }

  /**
   * Opens the tooltip and associates it with the trigger with the given id.
   */
  open(triggerId: string) {
    this.openByTrigger(triggerId);
  }

  /**
   * Closes the tooltip.
   */
  close() {
    this.closePopup();
  }

  /**
   * Whether the tooltip is currently open. Returns `false` while no root is attached to the handle.
   */
  get isOpen() {
    return this.attachedStore?.select('open') ?? false;
  }
}

/**
 * Creates a new handle to connect a Tooltip.Root with detached Tooltip.Trigger components.
 */
export function createTooltipHandle<Payload>(): TooltipHandle<Payload> {
  return new TooltipHandle<Payload>();
}

import { watch } from 'actview';
import type { ComputedRef } from 'actview';
import type { FloatingTreeStore } from '@/floating-ui-react/components/FloatingTreeStore';

/**
 * Subscribes to the floating tree's `close` event and forwards it to the popup
 * store's `setOpen(false)`.
 */
export function useTreeCloseEvents(
  floatingTreeRoot: ComputedRef<FloatingTreeStore>,
  handleClose: (event: {domEvent: Event | undefined; reason: string}) => void,) {
  watch(
    () => floatingTreeRoot.value,
    () => {
      const events = floatingTreeRoot.value?.events;
      if (!events) {
        return undefined;
      }

      events.on('close', handleClose);
      return () => {
        events.off('close', handleClose);
      };
    },
    {flush: 'post', immediate: true},
  );
}

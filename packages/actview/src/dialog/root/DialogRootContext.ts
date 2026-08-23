import { createContext } from 'actview';
import type { DialogStore } from '../store/DialogStore';

export type DialogRootContext<Payload = unknown> = DialogStore<Payload>;

export const DialogRootContext = createContext<DialogRootContext<unknown> | undefined>(undefined);

export function useDialogRootContext(optional = true): any {
  const context = DialogRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error(
      'Base UI: <Dialog.Root> is missing. Dialog parts must be placed within <Dialog.Root>.',
    );
  }
  return context.value;
}

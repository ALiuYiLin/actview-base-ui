import { createContext } from 'actview';

export const DialogPortalContext = createContext<boolean | undefined>(undefined);

export function useDialogPortalContext() {
  const context = DialogPortalContext.use();
  if (context.value === undefined) {
    throw new Error('Base UI: <Dialog.Portal> is missing.');
  }
  return context.value;
}

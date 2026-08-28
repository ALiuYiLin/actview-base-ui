import { createContext } from 'actview';

export const DialogPortalContext = createContext<boolean | undefined>(undefined);

export function useDialogPortalContext(): boolean {
  // store-as-is：use() 原样返回注入值（keepMounted 布尔）。
  const context = DialogPortalContext.use();
  if (context === undefined) {
    throw new Error('Base UI: <Dialog.Portal> is missing.');
  }
  return context;
}

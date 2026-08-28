import { createContext } from 'actview';
import type { DialogStore } from '../store/DialogStore';

export type DialogRootContext<Payload = unknown> = DialogStore<Payload>;

export const DialogRootContext = createContext<DialogRootContext<unknown> | undefined>(undefined);

export function useDialogRootContext(optional = true): any {
  // store-as-is：use() 原样返回注入的 store 载体（无 Provider 时 undefined）。
  const context = DialogRootContext.use();
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: <Dialog.Root> is missing. Dialog parts must be placed within <Dialog.Root>.',
    );
  }
  return context;
}

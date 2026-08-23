import { createContext } from 'actview';
import type { StoredToast } from '../store';

export interface ToastRootContextValue<Data extends object = any> {
  toast: StoredToast<Data>;
  close: () => void;
}

export const ToastRootContext = createContext<ToastRootContextValue | undefined>(undefined);

export function useToastRootContext(optional = true): any {
  const context = ToastRootContext.use();
  if (context.value === undefined && !optional) {
    throw new Error('Base UI: <Toast.Root> is missing.');
  }
  return context.value;
}

import { createContext } from 'actview';
import type { StoredToast } from '../store';

export interface ToastRootContextValue<Data extends object = any> {
  toast: StoredToast<Data>;
  close: () => void;
}

export const ToastRootContext = createContext<ToastRootContextValue | undefined>(undefined);

export function useToastRootContext(optional = true): any {
  // store-as-is：use() 原样返回注入的载体（无 Provider 时 undefined）。
  const context = ToastRootContext.use();
  if (context === undefined && !optional) {
    throw new Error('Base UI: <Toast.Root> is missing.');
  }
  return context;
}